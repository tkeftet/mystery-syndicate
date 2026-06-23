import cron from "node-cron";
import { processPassLifecycle } from "./pass.service";
import { logger } from "../../utils/logger";

/** Season-pass status transitions + ending notifications (every 15 min). */
export function startPassScheduler(): void {
  cron.schedule("*/15 * * * *", () => {
    processPassLifecycle().catch((err) =>
      logger.error("Pass lifecycle tick failed:", err),
    );
  });
  processPassLifecycle().catch((err) =>
    logger.error("Pass lifecycle (startup) failed:", err),
  );
  logger.info("Season pass scheduler started (every 15 min).");
}
