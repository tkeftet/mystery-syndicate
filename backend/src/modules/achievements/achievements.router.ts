import { Router } from "express";
import { authenticate } from "../auth";
import { listController, leaderboardController } from "./achievements.controller";

export const achievementsRouter = Router();

achievementsRouter.use(authenticate);

achievementsRouter.get("/", listController);
achievementsRouter.get("/leaderboard", leaderboardController);
