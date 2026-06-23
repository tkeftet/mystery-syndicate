import cron from "node-cron";
import { processEventLifecycle } from "./events.service";
import { logger } from "../../utils/logger";

/**
 * Drives event status transitions (upcoming → active → completed), reward
 * distribution, and lifecycle push notifications. Runs every 5 minutes; all
 * transitions/notifications are idempotent so the cadence is safe.
 */
export function startEventScheduler(): void {
  cron.schedule("*/5 * * * *", () => {
    processEventLifecycle().catch((err) =>
      logger.error("Event lifecycle tick failed:", err),
    );
  });

  // Run once on boot so a server restart picks up due transitions immediately.
  processEventLifecycle().catch((err) =>
    logger.error("Event lifecycle (startup) failed:", err),
  );

  logger.info("Event scheduler started (every 5 min).");
}
