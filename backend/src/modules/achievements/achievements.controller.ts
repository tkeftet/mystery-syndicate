import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./achievements.service";

export async function listController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Achievement name/description are returned RAW ({en,fr,ar}); the app
    // resolves them per language on render.
    const data = await service.getAchievements(req.userId!);
    res.json({ success: true, data });
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
