import {
  Agency,
  agencyLevelForXp,
  memberCapForLevel,
} from "./agency.model";
import {
  AgencyMember,
  ROLE_RANK,
  type AgencyRole,
} from "./agencyMember.model";
import { AgencyJoinRequest } from "./agencyJoinRequest.model";
import { User, type IUser } from "../users/user.model";
import { isOnline } from "../friends";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors/AppError";

const OFFENSIVE = ["fuck", "shit", "nigг", "bitch", "asshole", "cunt"];
function isOffensive(name: string) {
  const n = name.toLowerCase();
  return OFFENSIVE.some((w) => n.includes(w));
}

function weekKey(d = new Date()): string {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getMembership(userId: string) {
  return AgencyMember.findOne({ userId });
}

function mapMember(m: { userId: string; role: AgencyRole; contributionTotal: number; weeklyContribution: number }, u?: IUser) {
  return {
    userId: m.userId,
    role: m.role,
    contributionTotal: m.contributionTotal,
    weeklyContribution: m.weeklyContribution,
    username: u?.username ?? "Unknown",
    avatar: u?.avatar ?? "default",
    level: u?.level ?? 1,
    online: u ? u.privacy?.showOnline !== false && isOnline(u.lastSeenAt) : false,
  };
}

// ── Create / browse ──────────────────────────────────────────────────────────

export async function createAgency(
  userId: string,
  data: {
    name?: string;
    description?: string;
    privacy?: "public" | "request";
    minLevel?: number;
    language?: string;
    region?: string;
  },
) {
  const existing = await getMembership(userId);
  if (existing) throw new ConflictError("You're already in an agency.");

  const name = (data.name ?? "").trim();
  if (name.length < 3 || name.length > 24)
    throw new ValidationError("Agency name must be 3–24 characters.");
  if (isOffensive(name))
    throw new ValidationError("That name isn't allowed.");

  const nameLower = name.toLowerCase();
  if (await Agency.findOne({ nameLower }))
    throw new ConflictError("That agency name is taken.");

  const agency = await Agency.create({
    name,
    nameLower,
    description: data.description ?? "",
    privacy: data.privacy ?? "public",
    minLevel: data.minLevel ?? 1,
    language: data.language ?? "en",
    region: data.region ?? "global",
    leaderId: userId,
    memberCount: 1,
    lastWeekKey: weekKey(),
  });
  await AgencyMember.create({ agencyId: agency.id, userId, role: "leader" });
  return agency;
}

export async function listAgencies(q = "", page = 1, limit = 20) {
  const filter: Record<string, unknown> = {};
  if (q.trim()) filter.nameLower = { $regex: q.trim().toLowerCase(), $options: "i" };

  const agencies = await Agency.find(filter)
    .sort({ weeklyPoints: -1, memberCount: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1);

  const hasMore = agencies.length > limit;
  return {
    results: agencies.slice(0, limit).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      badge: a.badge,
      privacy: a.privacy,
      minLevel: a.minLevel,
      level: a.level,
      memberCount: a.memberCount,
      memberCap: memberCapForLevel(a.level),
      weeklyPoints: a.weeklyPoints,
    })),
    page,
    hasMore,
  };
}

export async function getAgencyView(agencyId: string, viewerId: string) {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new NotFoundError("Agency");

  const members = await AgencyMember.find({ agencyId }).sort({
    weeklyContribution: -1,
  });
  const users = await User.find({ _id: { $in: members.map((m) => m.userId) } }).select(
    "username avatar level lastSeenAt privacy",
  );
  const umap = new Map(users.map((u) => [u.id, u]));
  const myMember = members.find((m) => m.userId === viewerId);

  return {
    agency: {
      id: agency.id,
      name: agency.name,
      description: agency.description,
      badge: agency.badge,
      banner: agency.banner,
      privacy: agency.privacy,
      minLevel: agency.minLevel,
      region: agency.region,
      language: agency.language,
      level: agency.level,
      agencyXp: agency.agencyXp,
      weeklyPoints: agency.weeklyPoints,
      seasonalPoints: agency.seasonalPoints,
      memberCount: agency.memberCount,
      memberCap: memberCapForLevel(agency.level),
      xpForNextLevel: 1000 * (agency.level + 1),
    },
    myRole: myMember?.role ?? null,
    members: members.map((m) => mapMember(m, umap.get(m.userId))),
  };
}

export async function getMyAgency(userId: string) {
  const membership = await getMembership(userId);
  if (!membership) return { agency: null };
  return getAgencyView(membership.agencyId, userId);
}

// ── Join / leave ─────────────────────────────────────────────────────────────

export async function joinAgency(userId: string, agencyId: string) {
  if (await getMembership(userId))
    throw new ConflictError("You're already in an agency.");

  const agency = await Agency.findById(agencyId);
  if (!agency) throw new NotFoundError("Agency");

  const user = await User.findById(userId).select("level");
  if ((user?.level ?? 1) < agency.minLevel)
    throw new ValidationError(`Requires level ${agency.minLevel}.`);
  if (agency.memberCount >= memberCapForLevel(agency.level))
    throw new ValidationError("This agency is full.");

  if (agency.privacy === "request") {
    try {
      await AgencyJoinRequest.create({ agencyId, userId });
    } catch (err: any) {
      if (err?.code === 11000) throw new ConflictError("Request already sent.");
      throw err;
    }
    return { status: "requested" as const };
  }

  await AgencyMember.create({ agencyId, userId, role: "member" });
  await Agency.updateOne({ _id: agencyId }, { $inc: { memberCount: 1 } });
  return { status: "joined" as const };
}

export async function leaveAgency(userId: string) {
  const m = await getMembership(userId);
  if (!m) throw new ValidationError("You're not in an agency.");

  if (m.role === "leader") {
    const others = await AgencyMember.countDocuments({
      agencyId: m.agencyId,
      userId: { $ne: userId },
    });
    if (others > 0)
      throw new ValidationError(
        "Transfer leadership before leaving, or delete the agency.",
      );
    // Last member who is leader → delete the agency.
    await Promise.all([
      Agency.deleteOne({ _id: m.agencyId }),
      AgencyMember.deleteMany({ agencyId: m.agencyId }),
      AgencyJoinRequest.deleteMany({ agencyId: m.agencyId }),
    ]);
    return { ok: true, deletedAgency: true };
  }

  await m.deleteOne();
  await Agency.updateOne({ _id: m.agencyId }, { $inc: { memberCount: -1 } });
  return { ok: true };
}

// ── Requests ─────────────────────────────────────────────────────────────────

async function requireOfficer(userId: string) {
  const m = await getMembership(userId);
  if (!m || ROLE_RANK[m.role] < ROLE_RANK.officer)
    throw new ValidationError("You don't have permission.");
  return m;
}

export async function listRequests(userId: string) {
  const m = await requireOfficer(userId);
  const reqs = await AgencyJoinRequest.find({ agencyId: m.agencyId });
  const users = await User.find({ _id: { $in: reqs.map((r) => r.userId) } }).select(
    "username avatar level",
  );
  const umap = new Map(users.map((u) => [u.id, u]));
  return reqs.map((r) => ({
    userId: r.userId,
    username: umap.get(r.userId)?.username ?? "Unknown",
    avatar: umap.get(r.userId)?.avatar ?? "default",
    level: umap.get(r.userId)?.level ?? 1,
  }));
}

export async function approveRequest(userId: string, targetUserId: string) {
  const m = await requireOfficer(userId);
  const req = await AgencyJoinRequest.findOne({
    agencyId: m.agencyId,
    userId: targetUserId,
  });
  if (!req) throw new NotFoundError("Request");
  if (await getMembership(targetUserId)) {
    await req.deleteOne();
    throw new ValidationError("That player already joined an agency.");
  }
  const agency = await Agency.findById(m.agencyId);
  if (!agency) throw new NotFoundError("Agency");
  if (agency.memberCount >= memberCapForLevel(agency.level))
    throw new ValidationError("Agency is full.");

  await AgencyMember.create({
    agencyId: m.agencyId,
    userId: targetUserId,
    role: "member",
  });
  await Agency.updateOne({ _id: m.agencyId }, { $inc: { memberCount: 1 } });
  await req.deleteOne();
  return { ok: true };
}

export async function rejectRequest(userId: string, targetUserId: string) {
  const m = await requireOfficer(userId);
  await AgencyJoinRequest.deleteOne({
    agencyId: m.agencyId,
    userId: targetUserId,
  });
  return { ok: true };
}

// ── Roles / moderation ───────────────────────────────────────────────────────

async function membersInSameAgency(actorId: string, targetUserId: string) {
  const actor = await getMembership(actorId);
  if (!actor) throw new ValidationError("You're not in an agency.");
  const target = await AgencyMember.findOne({
    userId: targetUserId,
    agencyId: actor.agencyId,
  });
  if (!target) throw new NotFoundError("Member");
  return { actor, target };
}

export async function setRole(
  actorId: string,
  targetUserId: string,
  role: AgencyRole,
) {
  if (role === "leader") throw new ValidationError("Use transfer leadership.");
  const { actor, target } = await membersInSameAgency(actorId, targetUserId);
  if (ROLE_RANK[actor.role] < ROLE_RANK.coleader)
    throw new ValidationError("Only the leader or co-leader can change roles.");
  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role] || ROLE_RANK[role] >= ROLE_RANK[actor.role])
    throw new ValidationError("You can't assign a role at or above your own.");
  target.role = role;
  await target.save();
  return { ok: true };
}

export async function kickMember(actorId: string, targetUserId: string) {
  const { actor, target } = await membersInSameAgency(actorId, targetUserId);
  if (ROLE_RANK[actor.role] < ROLE_RANK.officer)
    throw new ValidationError("You don't have permission.");
  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role])
    throw new ValidationError("You can't kick someone at or above your rank.");
  await target.deleteOne();
  await Agency.updateOne({ _id: actor.agencyId }, { $inc: { memberCount: -1 } });
  return { ok: true };
}

export async function transferLeadership(actorId: string, targetUserId: string) {
  const { actor, target } = await membersInSameAgency(actorId, targetUserId);
  if (actor.role !== "leader")
    throw new ValidationError("Only the leader can transfer leadership.");
  actor.role = "coleader";
  target.role = "leader";
  await actor.save();
  await target.save();
  await Agency.updateOne({ _id: actor.agencyId }, { leaderId: targetUserId });
  return { ok: true };
}

export async function deleteAgency(actorId: string) {
  const m = await getMembership(actorId);
  if (!m || m.role !== "leader")
    throw new ValidationError("Only the leader can delete the agency.");
  await Promise.all([
    Agency.deleteOne({ _id: m.agencyId }),
    AgencyMember.deleteMany({ agencyId: m.agencyId }),
    AgencyJoinRequest.deleteMany({ agencyId: m.agencyId }),
  ]);
  return { ok: true };
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(scope: "weekly" | "global" = "weekly", limit = 100) {
  const sort = scope === "weekly" ? { weeklyPoints: -1 } : { agencyXp: -1 };
  const agencies = await Agency.find().sort(sort as any).limit(limit);
  return agencies.map((a, i) => ({
    rank: i + 1,
    id: a.id,
    name: a.name,
    badge: a.badge,
    level: a.level,
    memberCount: a.memberCount,
    weeklyPoints: a.weeklyPoints,
    agencyXp: a.agencyXp,
  }));
}

// ── Contribution (cross-cutting hook) + weekly reset ─────────────────────────

export async function addAgencyContribution(
  userId: string,
  points: number,
  _source: string,
): Promise<void> {
  if (points <= 0) return;
  const m = await getMembership(userId);
  if (!m) return;

  m.contributionTotal += points;
  m.weeklyContribution += points;
  await m.save();

  const agency = await Agency.findById(m.agencyId);
  if (!agency) return;
  agency.agencyXp += points;
  agency.weeklyPoints += points;
  agency.seasonalPoints += points;
  agency.level = agencyLevelForXp(agency.agencyXp);
  await agency.save();
}

/** Reset weekly points/contributions when a new ISO week begins. */
export async function processAgencyWeekly() {
  const cur = weekKey();
  const stale = await Agency.find({ lastWeekKey: { $ne: cur } });
  for (const a of stale) {
    a.weeklyPoints = 0;
    a.lastWeekKey = cur;
    await a.save();
    await AgencyMember.updateMany(
      { agencyId: a.id },
      { weeklyContribution: 0 },
    );
  }
}
