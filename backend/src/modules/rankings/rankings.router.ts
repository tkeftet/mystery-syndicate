import { Router } from "express";
import { authenticate } from "../auth";
import {
  getDailyController,
  getWeeklyController,
  getAllTimeController,
  getDetectiveOfTheWeekController,
  getMyRankController,
} from "./rankings.controller";

export const rankingsRouter = Router();

rankingsRouter.use(authenticate);

rankingsRouter.get("/daily", getDailyController);
rankingsRouter.get("/weekly", getWeeklyController);
rankingsRouter.get("/all-time", getAllTimeController);
rankingsRouter.get("/detective-of-week", getDetectiveOfTheWeekController);
rankingsRouter.get("/me", getMyRankController);
