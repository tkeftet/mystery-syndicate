import { Router } from "express";
import { authenticate } from "../auth";
import {
  hubController,
  rewardsController,
  claimController,
  claimAllController,
  leaderboardController,
} from "./pass.controller";

export const passRouter = Router();

passRouter.use(authenticate);

passRouter.get("/", hubController);
passRouter.get("/rewards", rewardsController);
passRouter.get("/leaderboard", leaderboardController);
passRouter.post("/claim", claimController);
passRouter.post("/claim-all", claimAllController);
