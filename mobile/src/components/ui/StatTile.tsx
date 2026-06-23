import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, typography } from "../../theme";

interface Props {
  value: string | number;
  label: string;
  valueColor?: string;
  /** Colored top accent bar (Variant A grid tiles). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

/** Serif value + mono caption stat tile, with optional top accent. */
export function StatTile({ value, label, valueColor, accent, style }: Props) {
  return (
    <View
      style={[
        styles.tile,
        accent ? { borderTopWidth: 2, borderTopColor: accent } : null,
        style,
      ]}
    >
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  value: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    lineHeight: typography.sizes.xl,
  },
  label: {
    fontFamily: typography.families.mono,
    fontSize: 8.5,
    letterSpacing: 1,
    color: colors.text.label,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
