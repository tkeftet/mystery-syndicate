import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radii, shadows, typography } from "../../theme";
import { Icon, IconName } from "./Icon";

interface Props {
  size?: number;
  /** Initials shown when no icon is provided. */
  initials?: string;
  icon?: IconName;
  shape?: "circle" | "square";
  /** Renders a corner level chip. */
  level?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Gradient avatar tile with optional corner level chip (Variant A). */
export function Avatar({
  size = 64,
  initials,
  icon,
  shape = "square",
  level,
  borderColor = colors.border.amber,
  style,
}: Props) {
  const radius = shape === "circle" ? size / 2 : Math.round(size * 0.28);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={gradients.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.tile,
          shadows.card,
          { width: size, height: size, borderRadius: radius, borderColor },
        ]}
      >
        {icon ? (
          <Icon name={icon} size={size * 0.42} color={colors.amberLight} />
        ) : (
          <Text
            style={[
              styles.initials,
              { fontSize: size * 0.42, lineHeight: size * 0.46 },
            ]}
          >
            {initials ?? "?"}
          </Text>
        )}
      </LinearGradient>
      {level != null && (
        <LinearGradient
          colors={gradients.levelChip}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.levelChip}
        >
          <Text style={styles.levelText}>{level}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  initials: {
    fontFamily: typography.families.display,
    color: colors.amberLight,
  },
  levelChip: {
    position: "absolute",
    bottom: -6,
    end: -6,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    fontFamily: typography.families.monoBold,
    fontSize: 11,
    color: colors.text.inverse,
  },
});
