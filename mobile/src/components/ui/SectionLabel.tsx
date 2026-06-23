import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, spacing, typography } from "../../theme";

interface Props {
  children: string;
  /** Optional right-aligned slot (e.g. "SEE ALL →"). */
  right?: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Mono uppercase micro-label used above sections (Variant A). */
export function SectionLabel({ children, right, color, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.label, color ? { color } : null]}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  label: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.xs,
    color: colors.text.label,
    letterSpacing: typography.tracking.widest,
    textTransform: "uppercase",
  },
});
