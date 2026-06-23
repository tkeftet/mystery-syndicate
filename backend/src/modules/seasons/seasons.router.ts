import { Router } from "express";
import { authenticate } from "../auth";
import {
  listSeasonsController,
  getSeasonController,
  seasonMapController,
  myProgressController,
  leaderboardController,
  startChapterController,
  submitChapterController,
} from "./seasons.controller";

export const seasonsRouter = Router();

seasonsRouter.use(authenticate);

seasonsRouter.get("/", listSeasonsController);
seasonsRouter.get("/:seasonId", getSeasonController);
seasonsRouter.get("/:seasonId/map", seasonMapController);
seasonsRouter.get("/:seasonId/me", myProgressController);
seasonsRouter.get("/:seasonId/leaderboard", leaderboardController);
seasonsRouter.post("/:seasonId/chapters/:n/start", startChapterController);
seasonsRouter.post("/:seasonId/chapters/:n/submit", submitChapterController);
