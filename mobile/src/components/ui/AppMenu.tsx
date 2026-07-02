import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radii } from "../../theme";
import { Icon, type IconName } from "./Icon";
import { useAuthStore } from "../../features/auth/auth.store";

type MenuItem = {
  icon: IconName;
  label: string;
  /** Screen registered in the ProfileStack. */
  route: string;
};

const ITEMS: MenuItem[] = [
  // Customize lives on the Profile screen; Daily Reward has a Home banner —
  // both removed here to keep this a focused "more" menu.
  { icon: "people", label: "Friends", route: "Friends" },
  { icon: "scales", label: "Agency", route: "Agencies" },
  { icon: "trophy", label: "Achievements", route: "Achievements" },
  { icon: "lock", label: "Privacy", route: "PrivacySettings" },
];

/**
 * Global top-right menu button. Tapping it opens a dropdown anchored under the
 * button with the cross-app navigation shortcuts and Sign Out at the bottom.
 * Drop `<AppMenu />` into any screen's header right slot.
 */
export function AppMenu() {
  const insets = useSafeAreaInsets();
  // Loosely typed: the same call (navigate to the Profile tab's nested screen)
  // works from any tab/stack because navigate bubbles up to the tab navigator.
  const navigation = useNavigation<any>();
  const { clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);

  const go = (route: string) => {
    setOpen(false);
    navigation.navigate("ProfileTab", { screen: route });
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Icon name="menu" size={20} color={colors.amber} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.panel, { top: insets.top + 52 }]}>
            {ITEMS.map((it) => (
              <TouchableOpacity
                key={it.route}
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => go(it.route)}
              >
                <Icon name={it.icon} size={18} color={colors.amber} />
                <Text style={styles.itemLabel}>{it.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => {
                setOpen(false);
                clearAuth();
              }}
            >
              <Icon name="logout" size={18} color={colors.coral} />
              <Text style={[styles.itemLabel, styles.signOut]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
  },
  panel: {
    position: "absolute",
    right: spacing[5],
    width: 220,
    backgroundColor: colors.bg.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: spacing[2],
    // subtle elevation
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  itemLabel: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  signOut: {
    color: colors.coral,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
    marginHorizontal: spacing[3],
  },
});
