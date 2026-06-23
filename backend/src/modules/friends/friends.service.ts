import { Friendship } from "./friendship.model";
import { User, type IUser } from "../users/user.model";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors/AppError";
import { recordAchievementEvent } from "../achievements";

function recordFriendAdded(a: string, b: string) {
  recordAchievementEvent(a, "friend_added", 1).catch(() => {});
  recordAchievementEvent(b, "friend_added", 1).catch(() => {});
}

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export type FriendStatus =
  | "self"
  | "friends"
  | "pending_sent"
  | "pending_received"
  | "blocked"
  | "blocked_by"
  | "none";

function isOnline(lastSeenAt?: Date | null): boolean {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

/** Public-facing summary of a user, respecting their privacy settings. */
function mapUser(u: IUser) {
  const showOnline = u.privacy?.showOnline !== false;
  const showLastSeen = u.privacy?.showLastSeen !== false;
  return {
    userId: u.id,
    username: u.username,
    avatar: u.avatar,
    rank: u.rank,
    level: u.level,
    streak: u.streak,
    online: showOnline ? isOnline(u.lastSeenAt) : false,
    lastSeenAt: showLastSeen ? u.lastSeenAt : null,
  };
}

const FRIEND_FIELDS =
  "username avatar rank level streak lastSeenAt privacy";

// ── Relationship status ──────────────────────────────────────────────────────

export async function getFriendStatus(
  viewerId: string,
  targetId: string,
): Promise<FriendStatus> {
  if (viewerId === targetId) return "self";
  const [a, b] = await Promise.all([
    Friendship.findOne({ requesterId: viewerId, receiverId: targetId }),
    Friendship.findOne({ requesterId: targetId, receiverId: viewerId }),
  ]);
  if (a?.status === "blocked") return "blocked";
  if (b?.status === "blocked") return "blocked_by";
  if (a?.status === "accepted" || b?.status === "accepted") return "friends";
  if (a?.status === "pending") return "pending_sent";
  if (b?.status === "pending") return "pending_received";
  return "none";
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function sendRequest(userId: string, targetId: string) {
  if (userId === targetId)
    throw new ValidationError("You can't add yourself.");

  const target = await User.findById(targetId);
  if (!target) throw new NotFoundError("User");
  if (target.privacy?.allowRequests === false)
    throw new ValidationError("This user isn't accepting friend requests.");

  const [a, b] = await Promise.all([
    Friendship.findOne({ requesterId: userId, receiverId: targetId }),
    Friendship.findOne({ requesterId: targetId, receiverId: userId }),
  ]);

  if (a?.status === "accepted" || b?.status === "accepted")
    throw new ConflictError("You're already friends.");
  if (a?.status === "blocked")
    throw new ValidationError("Unblock this user before adding them.");
  if (b?.status === "blocked")
    throw new ValidationError("You can't send a request to this user.");
  if (a?.status === "pending")
    throw new ConflictError("Request already sent.");

  // They already requested you → accept it (mutual).
  if (b?.status === "pending") {
    b.status = "accepted";
    await b.save();
    recordFriendAdded(userId, targetId);
    return { status: "accepted" as const };
  }

  // Re-open a previously rejected request, or create a new one.
  if (a) {
    a.status = "pending";
    await a.save();
  } else {
    await Friendship.create({
      requesterId: userId,
      receiverId: targetId,
      status: "pending",
    });
  }
  return { status: "pending" as const };
}

export async function acceptRequest(userId: string, requesterId: string) {
  const req = await Friendship.findOne({
    requesterId,
    receiverId: userId,
    status: "pending",
  });
  if (!req) throw new NotFoundError("Friend request");
  req.status = "accepted";
  await req.save();
  recordFriendAdded(userId, requesterId);
  return { status: "accepted" as const };
}

export async function rejectRequest(userId: string, requesterId: string) {
  const req = await Friendship.findOne({
    requesterId,
    receiverId: userId,
    status: "pending",
  });
  if (!req) throw new NotFoundError("Friend request");
  await req.deleteOne();
  return { ok: true };
}

export async function cancelRequest(userId: string, targetId: string) {
  const req = await Friendship.findOne({
    requesterId: userId,
    receiverId: targetId,
    status: "pending",
  });
  if (!req) throw new NotFoundError("Friend request");
  await req.deleteOne();
  return { ok: true };
}

export async function removeFriend(userId: string, friendId: string) {
  await Friendship.deleteMany({
    status: "accepted",
    $or: [
      { requesterId: userId, receiverId: friendId },
      { requesterId: friendId, receiverId: userId },
    ],
  });
  return { ok: true };
}

export async function blockUser(userId: string, targetId: string) {
  if (userId === targetId) throw new ValidationError("You can't block yourself.");
  // Drop any existing relationship rows, then record the block.
  await Friendship.deleteMany({
    $or: [
      { requesterId: userId, receiverId: targetId },
      { requesterId: targetId, receiverId: userId },
    ],
  });
  await Friendship.create({
    requesterId: userId,
    receiverId: targetId,
    status: "blocked",
  });
  return { ok: true };
}

export async function unblockUser(userId: string, targetId: string) {
  await Friendship.deleteOne({
    requesterId: userId,
    receiverId: targetId,
    status: "blocked",
  });
  return { ok: true };
}

// ── Reads ────────────────────────────────────────────────────────────────────

type FriendSort = "online" | "rank" | "streak" | "recent";

export async function listFriends(userId: string, sort: FriendSort = "online") {
  const rows = await Friendship.find({
    status: "accepted",
    $or: [{ requesterId: userId }, { receiverId: userId }],
  });
  const friendIds = rows.map((r) =>
    r.requesterId === userId ? r.receiverId : r.requesterId,
  );
  const users = await User.find({ _id: { $in: friendIds } }).select(
    FRIEND_FIELDS,
  );
  const list = users.map(mapUser);

  const RANK_ORDER = [
    "legend",
    "chief_inspector",
    "inspector",
    "senior_detective",
    "detective",
    "junior_detective",
    "rookie",
  ];
  list.sort((a, b) => {
    if (sort === "rank")
      return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (sort === "streak") return b.streak - a.streak;
    if (sort === "recent")
      return (
        new Date(b.lastSeenAt ?? 0).getTime() -
        new Date(a.lastSeenAt ?? 0).getTime()
      );
    // online first, then higher level
    if (a.online !== b.online) return a.online ? -1 : 1;
    return b.level - a.level;
  });
  return list;
}

export async function listRequests(userId: string) {
  const [incomingRows, outgoingRows] = await Promise.all([
    Friendship.find({ receiverId: userId, status: "pending" }),
    Friendship.find({ requesterId: userId, status: "pending" }),
  ]);

  const ids = [
    ...incomingRows.map((r) => r.requesterId),
    ...outgoingRows.map((r) => r.receiverId),
  ];
  const users = await User.find({ _id: { $in: ids } }).select(FRIEND_FIELDS);
  const umap = new Map(users.map((u) => [u.id, u]));

  return {
    incoming: incomingRows
      .map((r) => umap.get(r.requesterId))
      .filter(Boolean)
      .map((u) => mapUser(u as IUser)),
    outgoing: outgoingRows
      .map((r) => umap.get(r.receiverId))
      .filter(Boolean)
      .map((u) => mapUser(u as IUser)),
  };
}

export async function searchUsers(
  userId: string,
  q: string,
  page = 1,
  limit = 20,
) {
  const query = (q ?? "").trim();
  if (query.length < 2) return { results: [], page, hasMore: false };

  // Exclude self and anyone in a block relationship either way.
  const blocks = await Friendship.find({
    status: "blocked",
    $or: [{ requesterId: userId }, { receiverId: userId }],
  });
  const excluded = new Set<string>([userId]);
  blocks.forEach((b) => {
    excluded.add(b.requesterId);
    excluded.add(b.receiverId);
  });

  const users = await User.find({
    _id: { $nin: Array.from(excluded) },
    isBanned: false,
    username: { $regex: query, $options: "i" },
  })
    .select(FRIEND_FIELDS)
    .sort({ username: 1 })
    .skip((page - 1) * limit)
    .limit(limit + 1);

  const hasMore = users.length > limit;
  const slice = users.slice(0, limit);

  const results = await Promise.all(
    slice.map(async (u) => ({
      ...mapUser(u),
      friendStatus: await getFriendStatus(userId, u.id),
    })),
  );

  return { results, page, hasMore };
}

// ── Privacy ──────────────────────────────────────────────────────────────────

export async function getPrivacy(userId: string) {
  const user = await User.findById(userId).select("privacy");
  if (!user) throw new NotFoundError("User");
  return user.privacy;
}

const PRIVACY_KEYS = [
  "profileVisibility",
  "showOnline",
  "showLastSeen",
  "showStats",
  "allowRequests",
] as const;

export async function updatePrivacy(
  userId: string,
  patch: Record<string, unknown>,
) {
  const update: Record<string, unknown> = {};
  for (const key of PRIVACY_KEYS) {
    if (key in patch) update[`privacy.${key}`] = patch[key];
  }
  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
  }).select("privacy");
  if (!user) throw new NotFoundError("User");
  return user.privacy;
}

export async function touchPresence(userId: string) {
  await User.updateOne({ _id: userId }, { lastSeenAt: new Date() });
  return { ok: true };
}

export { isOnline };
