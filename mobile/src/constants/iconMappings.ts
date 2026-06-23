import { colors } from "../theme";
import type { IconName } from "../components/ui/Icon";

/**
 * Shared icon/label mappings for content categories (crime type, detective
 * rank, equipped avatar, equipped title). Centralized here so ProfileScreen,
 * PublicProfileModal, LeaderboardScreen, CaseDetailScreen, HomeScreen and
 * ShopScreen don't duplicate the same lookups. Use with the <Icon /> component.
 */

// ── Crime / case type ──────────────────────────────────────────────────────
export const CASE_TYPE_ICONS: Record<string, IconName> = {
  murder: "knife",
  theft: "cash",
  disappearance: "ghost",
  sabotage: "bomb",
  fraud: "masks",
};
export const CASE_TYPE_FALLBACK: IconName = "search";

export function caseTypeIcon(type: string): IconName {
  return CASE_TYPE_ICONS[type] ?? CASE_TYPE_FALLBACK;
}

// ── Detective rank ─────────────────────────────────────────────────────────
export type RankMeta = { label: string; icon: IconName; color: string };

export const RANK_META: Record<string, RankMeta> = {
  rookie: { label: "Rookie", icon: "search", color: colors.text.muted },
  junior_detective: {
    label: "Junior Detective",
    icon: "search",
    color: colors.info,
  },
  detective: { label: "Detective", icon: "incognito", color: colors.info },
  senior_detective: {
    label: "Senior Detective",
    icon: "incognito",
    color: colors.warning,
  },
  inspector: { label: "Inspector", icon: "star", color: colors.amber },
  chief_inspector: {
    label: "Chief Inspector",
    icon: "sparkles",
    color: colors.amber,
  },
  legend: { label: "Legend", icon: "crown", color: "#9B59B6" },
};

export function rankMeta(rank: string): RankMeta {
  return RANK_META[rank] ?? RANK_META.rookie;
}

// ── Equipped avatar item ───────────────────────────────────────────────────
export const AVATAR_ICONS: Record<string, IconName> = {
  avatar_detective: "incognito",
  avatar_masked: "masks",
  avatar_inspector: "search",
  avatar_prodigy: "sparkles",
  avatar_ace: "star",
  avatar_legend: "crown",
};

// ── Equipped title item ────────────────────────────────────────────────────
export type TitleMeta = { label: string; icon: IconName };

export const TITLE_META: Record<string, TitleMeta> = {
  title_shadow: { label: "Shadow Detective", icon: "moon" },
  title_arbiter: { label: "The Arbiter", icon: "scales" },
  title_mastermind: { label: "The Mastermind", icon: "brain" },
  title_maverick: { label: "The Maverick", icon: "bolt" },
  title_decorated: { label: "Decorated Agent", icon: "medal" },
  title_phantom: { label: "The Phantom", icon: "ghost" },
};

// ── Leaderboard medals (top 3) ─────────────────────────────────────────────
export const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD700", // gold
  2: "#C0C0C0", // silver
  3: "#CD7F32", // bronze
};
