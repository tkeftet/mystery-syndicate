import { Router } from "express";
import { authenticate } from "../auth";
import {
  listEventsController,
  globalLeaderboardController,
  getEventController,
  participateController,
  submitController,
  leaderboardController,
  myParticipationController,
} from "./events.controller";

export const eventsRouter = Router();

eventsRouter.use(authenticate);

eventsRouter.get("/", listEventsController);
// Static path before "/:eventId" so it isn't captured as an id.
eventsRouter.get("/global-leaderboard", globalLeaderboardController);
eventsRouter.get("/:eventId", getEventController);
eventsRouter.post("/:eventId/participate", participateController);
eventsRouter.post("/:eventId/submit", submitController);
eventsRouter.get("/:eventId/leaderboard", leaderboardController);
eventsRouter.get("/:eventId/me", myParticipationController);
