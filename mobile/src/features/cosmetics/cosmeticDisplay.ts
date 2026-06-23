import type { IconName } from "../../components/ui/Icon";
import type { Rarity } from "./cosmetics.service";

/**
 * Client-side display map for the visually-impactful cosmetics. Mirrors the
 * `value`/`rarity` of the backend catalog (cosmetics.catalog.ts) so the public
 * showcase — which only receives equipped ids — can render frames/backgrounds/
 * name colors/prestige/badges. Avatars/titles use AVATAR_ICONS / TITLE_META.
 */

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9A958B",
  rare: "#5B9BD6",
  epic: "#B58BD6",
  legendary: "#E8B04B",
  mythic: "#D6604B",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

export const BACKGROUND_GRADIENTS: Record<string, [string, string]> = {
  midnight: ["#16161C", "#0D0D0F"],
  crimson: ["#2A0D10", "#120609"],
  sepia: ["#2A2014", "#120D08"],
  azure: ["#0D1A2A", "#060E16"],
  violet: ["#1E0D2A", "#0E0614"],
  ember: ["#2A160D", "#120A06"],
};

interface DisplayEntry {
  category: "frame" | "background" | "nameColor" | "prestigeIcon" | "badge";
  rarity: Rarity;
  name: string;
  icon?: IconName;
  hex?: string;
  gradient?: string;
}

export const COSMETIC_DISPLAY: Record<string, DisplayEntry> = {
  // Frames (icon + rarity ring)
  frame_default: { category: "frame", rarity: "common", name: "Standard Issue", icon: "user" },
  frame_bronze: { category: "frame", rarity: "common", name: "Bronze Detective", icon: "medal" },
  frame_silver: { category: "frame", rarity: "rare", name: "Silver Detective", icon: "medal" },
  frame_gold: { category: "frame", rarity: "epic", name: "Gold Detective", icon: "crown" },
  frame_crimson: { category: "frame", rarity: "legendary", name: "Crimson Investigator", icon: "knife" },
  frame_shadow: { category: "frame", rarity: "mythic", name: "Shadow Hunter", icon: "ghost" },

  // Backgrounds
  bg_default: { category: "background", rarity: "common", name: "Midnight", gradient: "midnight" },
  bg_crime_scene: { category: "background", rarity: "common", name: "Crime Scene", gradient: "crimson" },
  bg_office: { category: "background", rarity: "common", name: "Detective Office", gradient: "sepia" },
  bg_police: { category: "background", rarity: "rare", name: "Police Station", gradient: "azure" },
  bg_archive: { category: "background", rarity: "epic", name: "Secret Archive", gradient: "violet" },
  bg_evidence: { category: "background", rarity: "legendary", name: "Evidence Wall", gradient: "ember" },

  // Name colors
  name_default: { category: "nameColor", rarity: "common", name: "Bone White", hex: "#EDEAE3" },
  name_amber: { category: "nameColor", rarity: "common", name: "Amber", hex: "#E8B04B" },
  name_green: { category: "nameColor", rarity: "common", name: "Forensic Green", hex: "#5BBF8A" },
  name_blue: { category: "nameColor", rarity: "rare", name: "Ice Blue", hex: "#5B9BD6" },
  name_crimson: { category: "nameColor", rarity: "epic", name: "Crimson", hex: "#D6604B" },
  name_gold: { category: "nameColor", rarity: "legendary", name: "Pure Gold", hex: "#FFD700" },
  name_mythic: { category: "nameColor", rarity: "mythic", name: "Spectral", hex: "#B58BD6" },

  // Prestige icons (beside the name)
  prestige_flame: { category: "prestigeIcon", rarity: "rare", name: "Flame", icon: "streak" },
  prestige_skull: { category: "prestigeIcon", rarity: "epic", name: "Skull", icon: "ghost" },
  prestige_crown: { category: "prestigeIcon", rarity: "legendary", name: "Crown", icon: "crown" },
  prestige_diamond: { category: "prestigeIcon", rarity: "mythic", name: "Diamond", icon: "sparkles" },

  // Badges (featured slot)
  badge_rookie: { category: "badge", rarity: "common", name: "Rookie Badge", icon: "search" },
  badge_sleuth: { category: "badge", rarity: "rare", name: "Sleuth Badge", icon: "incognito" },
  badge_perfectionist: { category: "badge", rarity: "epic", name: "Perfectionist", icon: "star" },
  badge_streaker: { category: "badge", rarity: "legendary", name: "Streak Master", icon: "streak" },
  badge_legend: { category: "badge", rarity: "mythic", name: "Living Legend", icon: "crown" },
  badge_agent: { category: "badge", rarity: "epic", name: "Agency Officer", icon: "scales" },
};

export function frameRingColor(frameId: string | null | undefined): string | null {
  if (!frameId) return null;
  const e = COSMETIC_DISPLAY[frameId];
  return e ? RARITY_COLORS[e.rarity] : null;
}

export function backgroundColors(bgId: string | null | undefined): [string, string] | null {
  if (!bgId) return null;
  const e = COSMETIC_DISPLAY[bgId];
  if (!e?.gradient) return null;
  return BACKGROUND_GRADIENTS[e.gradient] ?? null;
}

export function nameColorHex(id: string | null | undefined): string | null {
  if (!id) return null;
  return COSMETIC_DISPLAY[id]?.hex ?? null;
}

export function iconForCosmetic(id: string | null | undefined): IconName | null {
  if (!id) return null;
  return COSMETIC_DISPLAY[id]?.icon ?? null;
}
