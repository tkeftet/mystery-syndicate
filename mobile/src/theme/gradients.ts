/**
 * Gradient color stops for use with expo-linear-gradient.
 * Pair with start/end props, e.g. start={{x:0,y:0}} end={{x:1,y:1}}.
 */
export const gradients = {
  // Primary amber CTA
  cta: ["#E8C877", "#C99B3E"] as const,
  // Gold seal / trophy fill
  seal: ["#F0D488", "#B8893A"] as const,
  // Avatar tile (warm bronze)
  avatar: ["#2A2520", "#16140F"] as const,
  // Phone-frame / dark card sheen
  darkCard: ["#1E1E25", "#141418"] as const,
  // Hero cover glow (amber radial-ish, used left→right over a dark base)
  coverGlow: ["rgba(212,168,75,0.22)", "rgba(212,168,75,0)"] as const,
  // Level chip
  levelChip: ["#F0D488", "#B8893A"] as const,
} as const;
