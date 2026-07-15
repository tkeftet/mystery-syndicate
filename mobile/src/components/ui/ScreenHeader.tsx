import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, spacing, typography } from "../../theme";

interface Props {
  /** Small mono kicker above the title (e.g. a date or "// PROFILE"). */
  kicker?: string;
  title: string;
  /** Optional amber-italic accent appended after the title. */
  accent?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Date kicker + serif title + right slot (Variant A header). */
export function ScreenHeader({ kicker, title, accent, right, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text style={styles.title}>
          {title}
          {accent ? <Text style={styles.accent}> {accent}</Text> : null}
        </Text>
      </View>
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
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  left: { flex: 1, paddingEnd: spacing[3] },
  kicker: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: typography.tracking.wider,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    lineHeight: typography.sizes.xl * 1.1,
  },
  accent: {
    fontFamily: typography.families.displayItalic,
    color: colors.amber,
  },
});
