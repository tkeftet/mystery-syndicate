import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from "expo-server-sdk";
import { User } from "../users/user.model";
import { Case } from "../cases/case.model";
import { DEFAULT_LANG, resolveLocalized } from "../../shared/localized";
import { logger } from "../../utils/logger";

// No access token needed for the public Expo push service. If you later enable
// "Enhanced Security for Push Notifications" in expo.dev, pass an accessToken:
//   new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })
const expo = new Expo();

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send one payload to many Expo push tokens. Invalid tokens are skipped, sends
 * are chunked (the SDK throttles + gzips), and any token Expo reports as
 * `DeviceNotRegistered` is cleared from its user so we stop pushing to it.
 */
export async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] =
        await expo.sendPushNotificationsAsync(chunk);

      await Promise.all(
        tickets.map(async (ticket, i) => {
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            const badToken = chunk[i].to as string;
            await User.updateOne(
              { pushToken: badToken },
              { pushToken: null },
            );
          }
        }),
      );
    } catch (err) {
      logger.error("Push send failed for a chunk:", err);
    }
  }
}

/** Daily "a new case is available" announcement (sent by the 09:00 cron). */
export async function notifyNewCase(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const todayCase = await Case.findOne({
    availableDate: today,
    status: "active",
  });

  if (!todayCase) {
    logger.info("notifyNewCase: no active case for today, skipping.");
    return;
  }

  const users = await User.find({ pushToken: { $ne: null } }).select(
    "pushToken",
  );
  const tokens = users
    .map((u) => u.pushToken)
    .filter((t): t is string => !!t);

  logger.info(`notifyNewCase: sending to ${tokens.length} devices.`);
  await sendToTokens(tokens, {
    title: "🕵️ A new case is open",
    // Case title is localized ({en,fr,ar}); broadcast pushes use English.
    body: `${resolveLocalized(todayCase.title, DEFAULT_LANG)} — can you crack it today?`,
    data: { type: "new_case", caseId: todayCase.id },
  });
}

/** Evening reminder for players with a live streak who haven't played today. */
export async function notifyStreakReminder(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const users = await User.find({
    pushToken: { $ne: null },
    streak: { $gt: 0 },
  }).select("pushToken lastStreakDate");

  const tokens = users
    .filter((u) => {
      const last = u.lastStreakDate
        ? u.lastStreakDate.toISOString().split("T")[0]
        : null;
      return last !== today; // only those who haven't kept the streak today
    })
    .map((u) => u.pushToken)
    .filter((t): t is string => !!t);

  logger.info(`notifyStreakReminder: sending to ${tokens.length} devices.`);
  await sendToTokens(tokens, {
    title: "🔥 Don't break your streak!",
    body: "Solve today's case before midnight to keep your streak alive.",
    data: { type: "streak_reminder" },
  });
}
