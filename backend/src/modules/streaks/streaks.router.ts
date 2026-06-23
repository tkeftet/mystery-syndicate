import { Router } from "express";
import { authenticate } from "../auth";
import { updateStreakController } from "./streaks.controller";

export const streaksRouter = Router();

streaksRouter.use(authenticate);
streaksRouter.post("/update", updateStreakController);
