export const typography = {
  families: {
    // Serif display headlines — the signature of Variant A
    display: "DMSerifDisplay",
    displayItalic: "DMSerifDisplay-Italic",
    // Body / UI — Space Grotesk
    body: "SpaceGrotesk-Regular",
    medium: "SpaceGrotesk-Medium",
    semibold: "SpaceGrotesk-SemiBold",
    bold: "SpaceGrotesk-Bold",
    // Mono micro-labels
    mono: "SpaceMono",
    monoBold: "SpaceMono-Bold",
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 38,
    "4xl": 52,
  },
  lineHeights: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    loose: 1.7,
  },
  tracking: {
    tight: -0.3,
    normal: 0,
    wide: 1,
    wider: 1.6,
    widest: 2.4,
  },
} as const;
