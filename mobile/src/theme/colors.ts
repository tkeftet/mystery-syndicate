export const colors = {
  bg: {
    // Deep noir base + elevated surfaces (Variant A "chic feutré")
    primary: "#0D0D0F",
    secondary: "#15151A",
    tertiary: "#1C1C23",
    elevated: "#121216",
    sunken: "#101014",
    overlay: "rgba(8,8,10,0.62)",
  },
  // Amber ramp
  amber: "#D4A84B",
  amberLight: "#E8C877",
  amberDeep: "#C99B3E",
  amberDim: "#8A6A28",
  amberGlow: "rgba(212,168,75,0.15)",
  amberFaint: "rgba(212,168,75,0.08)",
  // Status accents (mockup palette)
  danger: "#E05252",
  coral: "#D46A5E",
  success: "#4CAF7D",
  green: "#6FBF8B",
  info: "#5A8ECC",
  blue: "#6FA0E8",
  warning: "#E0A033",
  text: {
    primary: "#F5F2EA",
    secondary: "#9C988E",
    muted: "#76726A",
    faint: "#56524A",
    soft: "#C8C4BA",
    label: "#86827A",
    inverse: "#1A140A",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.12)",
    amber: "rgba(212,168,75,0.30)",
  },
} as const;
