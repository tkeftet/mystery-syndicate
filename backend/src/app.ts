import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

import { authRouter } from "./modules/auth";
import { casesRouter } from "./modules/cases";
import { investigationsRouter } from "./modules/investigations";
import { streaksRouter } from "./modules/streaks";
import { rankingsRouter } from "./modules/rankings";
import { usersRouter } from "./modules/users";
import { rewardsRouter } from "./modules/rewards";
import { notificationsRouter } from "./modules/notifications";
import { adsRouter } from "./modules/ads";
import { eventsRouter } from "./modules/events";
import { seasonsRouter } from "./modules/seasons";
import { friendsRouter } from "./modules/friends";
import { passRouter } from "./modules/pass";
import { challengesRouter } from "./modules/challenges";
import { achievementsRouter } from "./modules/achievements";
import { agenciesRouter } from "./modules/agencies";
import { dailyLoginRouter } from "./modules/dailyLogin";
import { cosmeticsRouter } from "./modules/cosmetics";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production" ? ["https://yourapp.com"] : "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("combined"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/cases", casesRouter);
  app.use("/api/v1/investigations", investigationsRouter);
  app.use("/api/v1/streaks", streaksRouter);
  app.use("/api/v1/rankings", rankingsRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/rewards", rewardsRouter);
  app.use("/api/v1/ads", adsRouter);
  app.use("/api/v1/events", eventsRouter);
  app.use("/api/v1/seasons", seasonsRouter);
  app.use("/api/v1/friends", friendsRouter);
  app.use("/api/v1/pass", passRouter);
  app.use("/api/v1/challenges", challengesRouter);
  app.use("/api/v1/achievements", achievementsRouter);
  app.use("/api/v1/agencies", agenciesRouter);
  app.use("/api/v1/daily-login", dailyLoginRouter);
  app.use("/api/v1/cosmetics", cosmeticsRouter);

  // Dev-only manual push trigger (GET http://<host>:4000/api/v1/notifications/test)
  if (process.env.NODE_ENV !== "production") {
    app.use("/api/v1/notifications", notificationsRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
