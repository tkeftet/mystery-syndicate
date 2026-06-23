/**
 * Cosmetic catalog — the single source of truth for every customization item.
 *
 * Code-defined (like SHOP_ITEMS / LOGIN_REWARDS) so there's no seed step and the
 * catalog is versioned with the app. Ownership lives in `user.inventory` (the
 * universal owned-id set); equipped selections live in dedicated `user` fields
 * (activeFrame, activeBackground, activeNameColor, activePrestigeIcon,
 * featuredBadge). Avatars/titles are folded in here for a unified Customize UI
 * but keep using `user.avatar` / `user.title`.
 *
 * `unlock` drives AUTO-GRANT (see cosmetics.service `syncUnlocks`); `source` is
 * just the display label of where an item thematically comes from.
 */

export type CosmeticCategory =
  | "frame"
  | "background"
  | "nameColor"
  | "prestigeIcon"
  | "badge"
  | "avatar"
  | "title";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type UnlockSource =
  | "default"
  | "shop"
  | "achievement"
  | "season"
  | "story"
  | "mega"
  | "agency"
  | "event"
  | "level";

export type UnlockRule =
  | { type: "default" }
  | { type: "shop" }
  | { type: "accountLevel"; value: number }
  | { type: "seasonLevel"; value: number }
  | { type: "achievement"; key: string }
  | { type: "agencyRole"; role: "member" | "officer" | "coleader" | "leader" };

export interface Cosmetic {
  id: string;
  category: CosmeticCategory;
  name: string;
  rarity: Rarity;
  source: UnlockSource;
  /** Display payload: hex for nameColor, icon name for prestige/badge/frame, gradient key for background. */
  value?: string;
  /** Short "how to unlock" hint for locked items. */
  hint: string;
  unlock: UnlockRule;
}

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

export const COSMETICS: Cosmetic[] = [
  // ── Frames ──────────────────────────────────────────────────────────────────
  { id: "frame_default", category: "frame", name: "Standard Issue", rarity: "common", source: "default", value: "user", hint: "Default frame", unlock: { type: "default" } },
  { id: "frame_bronze", category: "frame", name: "Bronze Detective", rarity: "common", source: "level", value: "medal", hint: "Reach Level 3", unlock: { type: "accountLevel", value: 3 } },
  { id: "frame_silver", category: "frame", name: "Silver Detective", rarity: "rare", source: "level", value: "medal", hint: "Reach Level 7", unlock: { type: "accountLevel", value: 7 } },
  { id: "frame_gold", category: "frame", name: "Gold Detective", rarity: "epic", source: "level", value: "crown", hint: "Reach Level 15", unlock: { type: "accountLevel", value: 15 } },
  { id: "frame_crimson", category: "frame", name: "Crimson Investigator", rarity: "legendary", source: "achievement", value: "knife", hint: "Earn 25 perfect cases", unlock: { type: "achievement", key: "perfect_25" } },
  { id: "frame_shadow", category: "frame", name: "Shadow Hunter", rarity: "mythic", source: "achievement", value: "ghost", hint: "Hold a 100-day streak", unlock: { type: "achievement", key: "streak_100" } },

  // ── Backgrounds ───────────────────────────────────────────────────────────────
  { id: "bg_default", category: "background", name: "Midnight", rarity: "common", source: "default", value: "midnight", hint: "Default background", unlock: { type: "default" } },
  { id: "bg_crime_scene", category: "background", name: "Crime Scene", rarity: "common", source: "level", value: "crimson", hint: "Reach Level 2", unlock: { type: "accountLevel", value: 2 } },
  { id: "bg_office", category: "background", name: "Detective Office", rarity: "common", source: "level", value: "sepia", hint: "Reach Level 5", unlock: { type: "accountLevel", value: 5 } },
  { id: "bg_police", category: "background", name: "Police Station", rarity: "rare", source: "achievement", value: "azure", hint: "Solve 100 cases", unlock: { type: "achievement", key: "cases_100" } },
  { id: "bg_archive", category: "background", name: "Secret Archive", rarity: "epic", source: "season", value: "violet", hint: "Reach Season Level 15", unlock: { type: "seasonLevel", value: 15 } },
  { id: "bg_evidence", category: "background", name: "Evidence Wall", rarity: "legendary", source: "story", value: "ember", hint: "Complete 25 story chapters", unlock: { type: "achievement", key: "story_25" } },

  // ── Name colors ───────────────────────────────────────────────────────────────
  { id: "name_default", category: "nameColor", name: "Bone White", rarity: "common", source: "default", value: "#EDEAE3", hint: "Default name color", unlock: { type: "default" } },
  { id: "name_amber", category: "nameColor", name: "Amber", rarity: "common", source: "level", value: "#E8B04B", hint: "Reach Level 4", unlock: { type: "accountLevel", value: 4 } },
  { id: "name_green", category: "nameColor", name: "Forensic Green", rarity: "common", source: "achievement", value: "#5BBF8A", hint: "Solve 10 cases", unlock: { type: "achievement", key: "cases_10" } },
  { id: "name_blue", category: "nameColor", name: "Ice Blue", rarity: "rare", source: "level", value: "#5B9BD6", hint: "Reach Level 10", unlock: { type: "accountLevel", value: 10 } },
  { id: "name_crimson", category: "nameColor", name: "Crimson", rarity: "epic", source: "achievement", value: "#D6604B", hint: "Earn 25 perfect cases", unlock: { type: "achievement", key: "perfect_25" } },
  { id: "name_gold", category: "nameColor", name: "Pure Gold", rarity: "legendary", source: "achievement", value: "#FFD700", hint: "Hold a 30-day streak", unlock: { type: "achievement", key: "streak_30" } },
  { id: "name_mythic", category: "nameColor", name: "Spectral", rarity: "mythic", source: "mega", value: "#B58BD6", hint: "Win 10 Mega Cases", unlock: { type: "achievement", key: "mega_10" } },

  // ── Prestige icons (shown beside the name) ──────────────────────────────────────
  { id: "prestige_flame", category: "prestigeIcon", name: "Flame", rarity: "rare", source: "achievement", value: "streak", hint: "Hold a 7-day streak", unlock: { type: "achievement", key: "streak_7" } },
  { id: "prestige_skull", category: "prestigeIcon", name: "Skull", rarity: "epic", source: "achievement", value: "ghost", hint: "Solve 100 cases", unlock: { type: "achievement", key: "cases_100" } },
  { id: "prestige_crown", category: "prestigeIcon", name: "Crown", rarity: "legendary", source: "level", value: "crown", hint: "Reach Level 20", unlock: { type: "accountLevel", value: 20 } },
  { id: "prestige_diamond", category: "prestigeIcon", name: "Diamond", rarity: "mythic", source: "season", value: "sparkles", hint: "Reach Season Level 30", unlock: { type: "seasonLevel", value: 30 } },

  // ── Badges (featured badge slot) ────────────────────────────────────────────────
  { id: "badge_rookie", category: "badge", name: "Rookie Badge", rarity: "common", source: "default", value: "search", hint: "Default badge", unlock: { type: "default" } },
  { id: "badge_sleuth", category: "badge", name: "Sleuth Badge", rarity: "rare", source: "achievement", value: "incognito", hint: "Solve 10 cases", unlock: { type: "achievement", key: "cases_10" } },
  { id: "badge_perfectionist", category: "badge", name: "Perfectionist", rarity: "epic", source: "achievement", value: "star", hint: "Earn 25 perfect cases", unlock: { type: "achievement", key: "perfect_25" } },
  { id: "badge_streaker", category: "badge", name: "Streak Master", rarity: "legendary", source: "achievement", value: "streak", hint: "Hold a 30-day streak", unlock: { type: "achievement", key: "streak_30" } },
  { id: "badge_legend", category: "badge", name: "Living Legend", rarity: "mythic", source: "achievement", value: "crown", hint: "Solve 1000 cases", unlock: { type: "achievement", key: "cases_1000" } },
  { id: "badge_agent", category: "badge", name: "Agency Officer", rarity: "epic", source: "agency", value: "scales", hint: "Become an Agency officer", unlock: { type: "agencyRole", role: "officer" } },

  // ── Avatars (purchased in Shop — owned via inventory) ───────────────────────────
  { id: "avatar_default", category: "avatar", name: "Anonymous", rarity: "common", source: "default", value: "incognito", hint: "Default avatar", unlock: { type: "default" } },
  { id: "avatar_detective", category: "avatar", name: "Detective", rarity: "common", source: "shop", value: "incognito", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "avatar_masked", category: "avatar", name: "Masked Sleuth", rarity: "rare", source: "shop", value: "masks", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "avatar_inspector", category: "avatar", name: "Inspector", rarity: "rare", source: "shop", value: "search", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "avatar_prodigy", category: "avatar", name: "The Prodigy", rarity: "epic", source: "shop", value: "sparkles", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "avatar_ace", category: "avatar", name: "Ace Detective", rarity: "legendary", source: "shop", value: "star", hint: "Buy in Shop or earn at Day 30 login", unlock: { type: "shop" } },
  { id: "avatar_legend", category: "avatar", name: "Legend", rarity: "mythic", source: "shop", value: "crown", hint: "Buy in Shop (Level 10)", unlock: { type: "shop" } },

  // ── Titles (purchased in Shop / earned — owned via inventory) ───────────────────
  { id: "title_shadow", category: "title", name: "Shadow Detective", rarity: "rare", source: "shop", value: "moon", hint: "Buy in Shop or earn at Day 7 login", unlock: { type: "shop" } },
  { id: "title_arbiter", category: "title", name: "The Arbiter", rarity: "epic", source: "shop", value: "scales", hint: "Buy in Shop or earn at Day 21 login", unlock: { type: "shop" } },
  { id: "title_mastermind", category: "title", name: "The Mastermind", rarity: "legendary", source: "shop", value: "brain", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "title_maverick", category: "title", name: "The Maverick", rarity: "epic", source: "shop", value: "bolt", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "title_decorated", category: "title", name: "Decorated Agent", rarity: "legendary", source: "shop", value: "medal", hint: "Buy in Shop", unlock: { type: "shop" } },
  { id: "title_phantom", category: "title", name: "The Phantom", rarity: "mythic", source: "shop", value: "ghost", hint: "Buy in Shop", unlock: { type: "shop" } },
];

const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

export function getCosmetic(id: string): Cosmetic | undefined {
  return BY_ID.get(id);
}

/** Items granted automatically (not shop) — the auto-unlock pool. */
export const AUTO_UNLOCK_COSMETICS = COSMETICS.filter(
  (c) => c.unlock.type !== "shop",
);

/** The equip slot on the User document for each category. */
export const CATEGORY_SLOT: Record<
  CosmeticCategory,
  "activeFrame" | "activeBackground" | "activeNameColor" | "activePrestigeIcon" | "featuredBadge" | "avatar" | "title"
> = {
  frame: "activeFrame",
  background: "activeBackground",
  nameColor: "activeNameColor",
  prestigeIcon: "activePrestigeIcon",
  badge: "featuredBadge",
  avatar: "avatar",
  title: "title",
};
