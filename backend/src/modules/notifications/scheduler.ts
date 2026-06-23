import cron from "node-cron";
import { notifyNewCase, notifyStreakReminder } from "./notifications.service";
import { logger } from "../../utils/logger";

// Cron runs in the server's timezone unless overridden. Set CRON_TZ (e.g.
// "Africa/Algiers") so 09:00 / 20:00 fire in your players' local time.
const TZ = process.env.CRON_TZ || "UTC";

export function startSchedulers(): void {
  // 09:00 — daily "new case available" announcement.
  cron.schedule(
    "0 9 * * *",
    () => {
      notifyNewCase().catch((err) =>
        logger.error("notifyNewCase failed:", err),
      );
    },
    { timezone: TZ },
  );

  // 20:00 — streak reminder for players who haven't played today.
  cron.schedule(
    "0 20 * * *",
    () => {
      notifyStreakReminder().catch((err) =>
        logger.error("notifyStreakReminder failed:", err),
      );
    },
    { timezone: TZ },
  );

  logger.info(`Notification schedulers started (timezone: ${TZ}).`);
}
