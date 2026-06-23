import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { seedDatabase } from "./config/seed";

import { createSocketServer } from "./sockets";
import { startSchedulers } from "./modules/notifications";
import { startEventScheduler } from "./modules/events";
import { startSeasonScheduler } from "./modules/seasons";
import { startPassScheduler } from "./modules/pass";
import { startAgencyScheduler } from "./modules/agencies";
import { startDailyLoginScheduler } from "./modules/dailyLogin";
import { initMonitoring } from "./utils/monitoring";
import { logger } from "./utils/logger";

const PORT = process.env.PORT ?? 4000;

async function bootstrap() {
  initMonitoring();
  await connectDatabase();
  await seedDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  if (process.env.NODE_ENV !== "test") {
    startSchedulers();
    startEventScheduler();
    startSeasonScheduler();
    startPassScheduler();
    startAgencyScheduler();
    startDailyLoginScheduler();
  }
}

bootstrap().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
