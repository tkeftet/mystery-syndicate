import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radii, shadows } from "../../theme";

interface Props {
  /** 0..1 */
  progress: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Amber-glow gradient fill bar (Variant A). */
export function ProgressBar({ progress, height = 7, style }: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height }, style]}>
      <LinearGradient
        colors={gradients.cta}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          shadows.glow,
          { width: `${pct * 100}%`, height: "100%", borderRadius: height },
        ]}
      />
    </View>
  );
}

/** Segmented progress (discrete steps) — borrowed from Variant B for clarity. */
export function SegmentedProgress({
  filled,
  total,
  height = 5,
  style,
}: {
  filled: number;
  total: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segRow, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: 2,
            backgroundColor: i < filled ? colors.amber : colors.bg.tertiary,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.bg.tertiary,
    overflow: "hidden",
    borderRadius: radii.pill,
  },
  segRow: { flexDirection: "row", gap: 5 },
});
