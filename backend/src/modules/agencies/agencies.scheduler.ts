import cron from "node-cron";
import { processAgencyWeekly } from "./agencies.service";
import { logger } from "../../utils/logger";

/** Resets agency weekly points/contributions at the start of each ISO week. */
export function startAgencyScheduler(): void {
  cron.schedule("0 * * * *", () => {
    processAgencyWeekly().catch((err) =>
      logger.error("Agency weekly reset failed:", err),
    );
  });
  processAgencyWeekly().catch((err) =>
    logger.error("Agency weekly reset (startup) failed:", err),
  );
  logger.info("Agency scheduler started (hourly weekly-reset check).");
}
