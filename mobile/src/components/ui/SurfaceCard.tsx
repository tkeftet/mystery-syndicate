import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../../theme";

interface Props {
  children: React.ReactNode;
  /** Elevation preset. Defaults to "card". */
  elevation?: "none" | "card" | "hero";
  radius?: number;
  /** Optional left accent bar color (Variant A list cards). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Elevated dark surface — the building block of Variant A. Hairline border +
 * shadow over the deep-noir background. Pass `accent` for a colored left bar.
 */
export function SurfaceCard({
  children,
  elevation = "card",
  radius = radii.lg,
  accent,
  style,
}: Props) {
  return (
    <View
      style={[
        styles.base,
        { borderRadius: radius },
        elevation !== "none" && shadows[elevation],
        style,
      ]}
    >
      {accent && (
        <View
          style={[
            styles.accent,
            { backgroundColor: accent, borderTopLeftRadius: radius, borderBottomLeftRadius: radius },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
