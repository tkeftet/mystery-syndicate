import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { colors, typography, spacing, radii } from "../../theme";
import { Icon, type IconName } from "./Icon";

export type PopupVariant = "info" | "success" | "danger" | "warning";

export type PopupButton = {
  label: string;
  onPress?: () => void;
  /** primary = filled accent, secondary = ghost, danger = filled red */
  variant?: "primary" | "secondary" | "danger";
  /** shows a spinner instead of the label and blocks taps */
  loading?: boolean;
};

interface Props {
  visible: boolean;
  /** Header title */
  title: string;
  /** Body copy */
  message?: string;
  /** Icon shown above the title; falls back to a per-variant default */
  icon?: IconName;
  /** Drives accent color + default icon. Defaults to "info". */
  variant?: PopupVariant;
  /** Action buttons. Defaults to a single "OK" button that calls onClose. */
  buttons?: PopupButton[];
  /** Called on backdrop / Android back press. */
  onClose: () => void;
  /** Optional extra content rendered between the message and the buttons. */
  children?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  PopupVariant,
  { color: string; icon: IconName }
> = {
  info: { color: colors.amber, icon: "hint" },
  success: { color: colors.green, icon: "checkCircle" },
  danger: { color: colors.coral, icon: "closeCircle" },
  warning: { color: colors.warning, icon: "warning" },
};

export function AppPopup({
  visible,
  title,
  message,
  icon,
  variant = "info",
  buttons,
  onClose,
  children,
}: Props) {
  const cfg = VARIANT_CONFIG[variant];
  const resolvedButtons: PopupButton[] = buttons?.length
    ? buttons
    : [{ label: "OK", variant: "primary", onPress: onClose }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor: cfg.color }]}>
          <View
            style={[styles.iconCircle, { backgroundColor: cfg.color + "1A" }]}
          >
            <Icon name={icon ?? cfg.icon} size={28} color={cfg.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          {children}

          <View
            style={[
              styles.buttonRow,
              resolvedButtons.length > 2 && styles.buttonColumn,
            ]}
          >
            {resolvedButtons.map((btn, i) => {
              const isPrimary = (btn.variant ?? "primary") === "primary";
              const isDanger = btn.variant === "danger";
              return (
                <TouchableOpacity
                  key={`${btn.label}-${i}`}
                  style={[
                    styles.button,
                    isPrimary && { backgroundColor: cfg.color },
                    isDanger && styles.buttonDanger,
                    btn.variant === "secondary" && styles.buttonSecondary,
                  ]}
                  onPress={btn.onPress}
                  disabled={btn.loading}
                  activeOpacity={0.8}
                >
                  {btn.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        btn.variant === "secondary"
                          ? colors.text.secondary
                          : colors.text.inverse
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        btn.variant === "secondary" &&
                          styles.buttonTextSecondary,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radii.xl,
    padding: spacing[6],
    alignItems: "center",
    borderWidth: 1,
    width: "100%",
    gap: spacing[3],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    textAlign: "center",
  },
  message: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    color: colors.text.soft,
    textAlign: "center",
    lineHeight: typography.sizes.sm * 1.5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing[3],
    width: "100%",
    marginTop: spacing[2],
  },
  buttonColumn: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonDanger: {
    backgroundColor: colors.coral,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  buttonText: {
    fontFamily: typography.families.bold,
    fontSize: typography.sizes.base,
    color: colors.text.inverse,
  },
  buttonTextSecondary: {
    color: colors.text.secondary,
  },
});
