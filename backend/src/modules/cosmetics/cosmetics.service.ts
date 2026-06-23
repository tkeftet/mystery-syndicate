import { User } from "../users/user.model";
import { UserAchievement } from "../achievements/userAchievement.model";
import { getAchievementScore } from "../achievements";
import { PassProgress } from "../pass/passProgress.model";
import { SeasonPass } from "../pass/seasonPass.model";
import { AgencyMember, ROLE_RANK } from "../agencies/agencyMember.model";
import { Agency } from "../agencies/agency.model";
import { sendToTokens } from "../notifications";
import { getFriendStatus } from "../friends/friends.service";
import { ValidationError, NotFoundError } from "../../shared/errors/AppError";
import { logger } from "../../utils/logger";
import { ProfileLike } from "./profileLike.model";
import {
  COSMETICS,
  AUTO_UNLOCK_COSMETICS,
  CATEGORY_SLOT,
  RARITY_ORDER,
  getCosmetic,
  type Cosmetic,
  type CosmeticCategory,
  type UnlockRule,
} from "./cosmetics.catalog";

// ── Unlock evaluation ──────────────────────────────────────────────────────────

interface UnlockContext {
  accountLevel: number;
  unlockedAchievements: Set<string>;
  seasonLevel: number;
  agencyRoleRank: number;
}

async function buildContext(userId: string, accountLevel: number): Promise<UnlockContext> {
  const [achievements, agencyMember, activePass] = await Promise.all([
    UserAchievement.find({ userId, unlocked: true }).select("achievementKey").lean(),
    AgencyMember.findOne({ userId }).select("role").lean(),
    SeasonPass.findOne({ status: "active" }).select("_id").lean(),
  ]);

  let seasonLevel = 0;
  if (activePass) {
    const pp = await PassProgress.findOne({ userId, passId: String(activePass._id) })
      .select("level")
      .lean();
    seasonLevel = pp?.level ?? 0;
  }

  return {
    accountLevel,
    unlockedAchievements: new Set(achievements.map((a) => a.achievementKey)),
    seasonLevel,
    agencyRoleRank: agencyMember ? ROLE_RANK[agencyMember.role] ?? 0 : 0,
  };
}

function isUnlocked(rule: UnlockRule, ctx: UnlockContext): boolean {
  switch (rule.type) {
    case "default": return true;
    case "shop": return false; // granted by purchase, never auto
    case "accountLevel": return ctx.accountLevel >= rule.value;
    case "seasonLevel": return ctx.seasonLevel >= rule.value;
    case "achievement": return ctx.unlockedAchievements.has(rule.key);
    case "agencyRole": return ctx.agencyRoleRank >= (ROLE_RANK[rule.role] ?? 99);
  }
}

/**
 * Reconcile a user's earned cosmetics with their current progression. Grants any
 * newly-qualified auto-unlock items into `inventory` (idempotent via $addToSet),
 * fires a "new cosmetic" push for fresh unlocks, and returns the new items.
 * Called from the case-submit fan-out and whenever the Customize screen loads, so
 * grants can never be permanently missed.
 */
export async function syncUnlocks(userId: string): Promise<Cosmetic[]> {
  const user = await User.findById(userId).select("level inventory pushToken");
  if (!user) return [];

  const ctx = await buildContext(userId, user.level);
  const owned = new Set(user.inventory);

  const newly: Cosmetic[] = [];
  for (const c of AUTO_UNLOCK_COSMETICS) {
    if (owned.has(c.id)) continue;
    if (isUnlocked(c.unlock, ctx)) newly.push(c);
  }
  if (newly.length === 0) return [];

  await User.findByIdAndUpdate(userId, {
    $addToSet: { inventory: { $each: newly.map((c) => c.id) } },
  });

  logger.info(`Cosmetics unlocked for ${userId}: ${newly.map((c) => c.id).join(", ")}`);
  notifyCosmeticUnlock(user.pushToken, newly).catch(() => {});
  return newly;
}

async function notifyCosmeticUnlock(
  pushToken: string | null,
  items: Cosmetic[],
): Promise<void> {
  if (!pushToken || items.length === 0) return;
  const rarest = items.reduce((a, b) =>
    RARITY_ORDER[b.rarity] > RARITY_ORDER[a.rarity] ? b : a,
  );
  const isRare = RARITY_ORDER[rarest.rarity] >= RARITY_ORDER.epic;
  await sendToTokens([pushToken], {
    title: isRare ? "✨ Rare cosmetic earned!" : "🎨 New cosmetic unlocked",
    body:
      items.length === 1
        ? `You unlocked “${rarest.name}” (${rarest.rarity}). Equip it on your profile!`
        : `You unlocked ${items.length} new cosmetics, including “${rarest.name}”.`,
    data: { screen: "CustomizeProfile" },
  });
}

// ── Customization (own profile) ─────────────────────────────────────────────────

export async function getCustomization(userId: string) {
  await syncUnlocks(userId);
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User");

  const owned = new Set(user.inventory);
  const equipped: Record<string, string | null> = {
    frame: user.activeFrame,
    background: user.activeBackground,
    nameColor: user.activeNameColor,
    prestigeIcon: user.activePrestigeIcon,
    badge: user.featuredBadge,
    avatar: user.avatar,
    title: user.title,
    featuredAchievement: user.featuredAchievement,
  };

  const items = COSMETICS.map((c) => ({
    id: c.id,
    category: c.category,
    name: c.name,
    rarity: c.rarity,
    source: c.source,
    value: c.value ?? null,
    hint: c.hint,
    owned: owned.has(c.id),
    equipped: equipped[c.category] === c.id,
  }));

  return {
    items,
    equipped,
    profileLikes: user.profileLikes,
    profileViews: user.profileViews,
    ownedCount: items.filter((i) => i.owned).length,
    totalCount: items.length,
  };
}

// ── Equip / unequip ─────────────────────────────────────────────────────────────

const EQUIPPABLE: CosmeticCategory[] = [
  "frame", "background", "nameColor", "prestigeIcon", "badge", "avatar", "title",
];

export async function equipCosmetic(
  userId: string,
  category: string,
  id: string | null,
) {
  await syncUnlocks(userId);
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User");

  // Featured achievement is a showcased achievement key, not a catalog cosmetic.
  if (category === "featuredAchievement") {
    if (id) {
      const ua = await UserAchievement.findOne({ userId, achievementKey: id, unlocked: true });
      if (!ua) throw new ValidationError("You haven't unlocked that achievement.");
    }
    user.featuredAchievement = id;
    await user.save();
    return { category, id };
  }

  if (!EQUIPPABLE.includes(category as CosmeticCategory))
    throw new ValidationError("Unknown customization category.");

  if (id !== null) {
    const cosmetic = getCosmetic(id);
    if (!cosmetic || cosmetic.category !== category)
      throw new ValidationError("That item doesn't exist for this category.");
    // Anti-cheat: equipping requires real ownership (sync already granted earned
    // items; shop items enter inventory on purchase). No client-supplied unlocks.
    if (!user.inventory.includes(id))
      throw new ValidationError("You don't own that item yet.");
  } else if (category === "avatar") {
    // Avatar can't be empty — fall back to default.
    id = "default";
  }

  const slot = CATEGORY_SLOT[category as CosmeticCategory];
  (user as any)[slot] = id;
  await user.save();

  logger.info(`Equipped ${category}=${id} for ${userId}`);
  return { category, id };
}

// ── Public showcase enrichment (spread into the public profile response) ────────

export async function getShowcaseExtras(targetUserId: string, viewerId: string) {
  const user = await User.findById(targetUserId).select(
    "activeFrame activeBackground activeNameColor activePrestigeIcon featuredBadge featuredAchievement profileLikes",
  );
  if (!user) return null;

  // Count a profile view (not your own).
  if (viewerId !== targetUserId) {
    await User.findByIdAndUpdate(targetUserId, { $inc: { profileViews: 1 } });
  }

  const [member, activePass, likedByMe] = await Promise.all([
    AgencyMember.findOne({ userId: targetUserId }).select("agencyId role").lean(),
    SeasonPass.findOne({ status: "active" }).select("_id").lean(),
    viewerId !== targetUserId
      ? ProfileLike.exists({ userId: viewerId, targetId: targetUserId })
      : Promise.resolve(null),
  ]);

  let agency: { name: string; role: string } | null = null;
  if (member) {
    const ag = await Agency.findById(member.agencyId).select("name").lean();
    if (ag) agency = { name: ag.name, role: member.role };
  }

  let seasonLevel = 0;
  if (activePass) {
    const pp = await PassProgress.findOne({ userId: targetUserId, passId: String(activePass._id) })
      .select("level")
      .lean();
    seasonLevel = pp?.level ?? 0;
  }

  return {
    activeFrame: user.activeFrame,
    activeBackground: user.activeBackground,
    activeNameColor: user.activeNameColor,
    activePrestigeIcon: user.activePrestigeIcon,
    featuredBadge: user.featuredBadge,
    featuredAchievement: user.featuredAchievement,
    profileLikes: user.profileLikes,
    likedByMe: !!likedByMe,
    agency,
    seasonLevel,
  };
}

// ── Likes ────────────────────────────────────────────────────────────────────

export async function toggleLike(viewerId: string, targetId: string) {
  if (viewerId === targetId) throw new ValidationError("You can't like your own profile.");
  const target = await User.findById(targetId).select("_id");
  if (!target) throw new NotFoundError("User");

  // Only friends can like (social-engagement scope).
  const status = await getFriendStatus(viewerId, targetId);
  if (status !== "friends")
    throw new ValidationError("You can only like a friend's profile.");

  const existing = await ProfileLike.findOne({ userId: viewerId, targetId });
  if (existing) {
    await existing.deleteOne();
    await User.findByIdAndUpdate(targetId, { $inc: { profileLikes: -1 } });
    return { liked: false };
  }
  await ProfileLike.create({ userId: viewerId, targetId });
  await User.findByIdAndUpdate(targetId, { $inc: { profileLikes: 1 } });
  return { liked: true };
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export async function getCosmeticsAnalytics() {
  const totalUsers = await User.countDocuments();

  async function topEquipped(field: string) {
    const rows = await User.aggregate([
      { $match: { [field]: { $ne: null } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    return rows.map((r) => ({ id: r._id, count: r.count }));
  }

  const [frames, backgrounds, nameColors, badges, ownership] = await Promise.all([
    topEquipped("activeFrame"),
    topEquipped("activeBackground"),
    topEquipped("activeNameColor"),
    topEquipped("featuredBadge"),
    User.aggregate([
      { $unwind: "$inventory" },
      { $group: { _id: "$inventory", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
  ]);

  const [viewsAgg] = await User.aggregate([
    { $group: { _id: null, totalViews: { $sum: "$profileViews" }, totalLikes: { $sum: "$profileLikes" } } },
  ]);

  return {
    totalUsers,
    totalProfileViews: viewsAgg?.totalViews ?? 0,
    totalProfileLikes: viewsAgg?.totalLikes ?? 0,
    mostEquipped: { frames, backgrounds, nameColors, badges },
    unlockRates: ownership
      .filter((o) => getCosmetic(o._id))
      .map((o) => ({
        id: o._id,
        owners: o.count,
        rate: totalUsers ? Math.round((o.count / totalUsers) * 100) / 100 : 0,
      })),
  };
}

export { getAchievementScore };
