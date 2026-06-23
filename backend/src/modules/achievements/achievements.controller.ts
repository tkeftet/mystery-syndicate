import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./achievements.service";

export async function listController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getAchievements(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function leaderboardController(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getAchievementLeaderboard() });
  } catch (err) {
    next(err);
  }
}
