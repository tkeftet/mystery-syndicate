import { Router } from "express";
import { authenticate } from "../auth";
import {
  calendarController,
  claimController,
  analyticsController,
} from "./dailyLogin.controller";

export const dailyLoginRouter = Router();

dailyLoginRouter.use(authenticate);

dailyLoginRouter.get("/", calendarController);
dailyLoginRouter.post("/claim", claimController);
// Aggregate engagement metrics (daily claim rate, avg streak, missed-day freq…).
dailyLoginRouter.get("/analytics", analyticsController);

// NOTE: streak catch-up is granted ONLY through the verified AdMob SSV callback
// (see ads.service `grantVerifiedReward` → applyStreakSave). There is
// deliberately no client-callable endpoint, so a streak can't be saved without
// Google confirming the rewarded ad was actually watched.
