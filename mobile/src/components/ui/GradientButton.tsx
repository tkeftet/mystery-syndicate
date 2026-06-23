import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography, radii, shadows, gradients } from "../../theme";
import { Icon, IconName } from "./Icon";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "outline";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary call-to-action. `solid` renders the amber gradient with an amber glow
 * (Variant A hero button); `outline` renders the amber-tinted bordered button.
 */
export function GradientButton({
  label,
  onPress,
  variant = "solid",
  icon,
  iconRight,
  loading,
  disabled,
  style,
}: Props) {
  const isSolid = variant === "solid";
  const contentColor = isSolid ? colors.text.inverse : colors.amberLight;

  const inner = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={17} color={contentColor} />}
          <Text
            style={[
              styles.label,
              { color: contentColor },
              !isSolid && styles.labelOutline,
            ]}
          >
            {label}
          </Text>
          {iconRight && <Icon name={iconRight} size={17} color={contentColor} />}
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[isSolid && shadows.cta, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      {isSolid ? (
        <LinearGradient
          colors={gradients.cta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.solid}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={styles.outline}>{inner}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  solid: {
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.amberFaint,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  label: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    letterSpacing: 0.2,
  },
  labelOutline: {
    fontFamily: typography.families.monoBold,
    fontSize: typography.sizes.sm,
    letterSpacing: 1,
  },
});
