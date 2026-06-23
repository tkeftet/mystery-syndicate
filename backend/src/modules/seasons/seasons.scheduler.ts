import cron from "node-cron";
import { processSeasonLifecycle } from "./seasons.service";
import { logger } from "../../utils/logger";

/**
 * Drives season status transitions, daily chapter-unlock notifications, and
 * finale/ending teasers. Runs every 15 minutes; all transitions and
 * notifications are deduped (via `season.notificationsSent`).
 */
export function startSeasonScheduler(): void {
  cron.schedule("*/15 * * * *", () => {
    processSeasonLifecycle().catch((err) =>
      logger.error("Season lifecycle tick failed:", err),
    );
  });

  processSeasonLifecycle().catch((err) =>
    logger.error("Season lifecycle (startup) failed:", err),
  );

  logger.info("Season scheduler started (every 15 min).");
}
