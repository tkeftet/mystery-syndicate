import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, typography } from "../../theme";
import { Icon, IconName } from "./Icon";

/** Small mono pill — case type, meta tags, etc. */
export function Pill({
  label,
  color = colors.amberLight,
  icon,
  tint,
  style,
}: {
  label: string;
  color?: string;
  icon?: IconName;
  /** Background tint; defaults to a faint wash of `color`. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.pill,
        { borderColor: color + "55", backgroundColor: tint ?? color + "1F" },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={12} color={color} />}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Solid amber "NEW" style chip. */
export function SolidChip({ label }: { label: string }) {
  return (
    <View style={styles.solidChip}>
      <Text style={styles.solidChipText}>{label}</Text>
    </View>
  );
}

/** Status pill with a leading dot — SOLVED / MISSED / etc. */
export function StatusPill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.status, { backgroundColor: color + "1F" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

/** Diamond pips for difficulty (filled = level). */
export function DifficultyPips({
  level,
  total = 5,
  label,
  color = colors.amber,
}: {
  level: number;
  total?: number;
  label?: string;
  color?: string;
}) {
  return (
    <View style={styles.pipsRow}>
      <View style={styles.pips}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              i < level
                ? { backgroundColor: color }
                : { borderWidth: 1, borderColor: color + "66" },
            ]}
          />
        ))}
      </View>
      {label && (
        <Text style={[styles.pipsLabel, { color: colors.amberDeep }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  solidChip: {
    backgroundColor: colors.amber,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  solidChipText: {
    fontFamily: typography.families.monoBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.text.inverse,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusText: {
    fontFamily: typography.families.mono,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  pipsRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  pips: { flexDirection: "row", gap: 3, alignItems: "center" },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    transform: [{ rotate: "45deg" }],
  },
  pipsLabel: {
    fontFamily: typography.families.mono,
    fontSize: 10,
    letterSpacing: 0.6,
  },
});
