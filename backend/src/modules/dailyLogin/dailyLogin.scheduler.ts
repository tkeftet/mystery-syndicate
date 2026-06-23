import cron from "node-cron";
import { notifyRewardAvailable, notifyStreakRisk } from "./dailyLogin.service";
import { logger } from "../../utils/logger";

// Same timezone convention as the other schedulers (set CRON_TZ for your players).
const TZ = process.env.CRON_TZ || "UTC";

/** Daily-login engagement pushes: reward reminder (morning) + streak-risk (night). */
export function startDailyLoginScheduler(): void {
  // 11:00 — gentle "your reward is ready" nudge.
  cron.schedule(
    "0 11 * * *",
    () => {
      notifyRewardAvailable().catch((err) =>
        logger.error("notifyRewardAvailable failed:", err),
      );
    },
    { timezone: TZ },
  );

  // 21:00 — "don't lose your streak" last-chance warning.
  cron.schedule(
    "0 21 * * *",
    () => {
      notifyStreakRisk().catch((err) =>
        logger.error("notifyStreakRisk failed:", err),
      );
    },
    { timezone: TZ },
  );

  logger.info(`Daily-login scheduler started (timezone: ${TZ}).`);
}
