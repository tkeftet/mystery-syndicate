import { ViewStyle } from "react-native";

/**
 * Elevation presets for Variant A ("chic feutré"). RN cross-platform shadow
 * (iOS shadow* + Android elevation). Use by spreading into a style object.
 */
export const shadows: Record<"card" | "hero" | "cta" | "glow", ViewStyle> = {
  // Subtle lift for list cards / tiles
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  // Deep elevation for the hero "case of the day" card
  hero: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 12,
  },
  // Amber glow under the primary CTA
  cta: {
    shadowColor: "#D4A84B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 10,
  },
  // Soft amber glow halo (seal / accents)
  glow: {
    shadowColor: "#E8C877",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 8,
  },
};
