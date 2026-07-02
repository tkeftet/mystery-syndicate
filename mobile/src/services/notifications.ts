import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { apiClient } from "./api";

/**
 * Push notification registration for the Mystery Syndicate app.
 *
 * NOTE: remote push requires a development build (EAS) — it does NOT work in
 * Expo Go on SDK 53+. `registerForPushNotificationsAsync` is written to fail
 * soft (returns null) so the app still runs fine in Expo Go.
 *
 * Setup:  npx expo install expo-notifications expo-constants
 * and run `eas init` so `extra.eas.projectId` is populated in app.json.
 */

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn(
        "No EAS projectId found — run `eas init` before requesting a push token.",
      );
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    return token;
  } catch (err) {
    // Expected in Expo Go (no native push module) — fail soft.
    console.warn("Push registration skipped/failed:", err);
    return null;
  }
}

/** Register for push and send the Expo token to the backend. Call after login. */
export async function syncPushToken(): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  try {
    await apiClient.post("/users/me/push-token", { token });
  } catch (err) {
    console.warn("Failed to sync push token to backend:", err);
  }
}
