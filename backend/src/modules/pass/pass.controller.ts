import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./pass.service";

export async function hubController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Pass title/subtitle/description are returned RAW ({en,fr,ar}); the app
    // resolves them per language on render.
    const data = await service.getHub(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function rewardsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getRewards(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function claimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const level = Number(req.body?.level);
    res.json({ success: true, data: await service.claimLevel(req.userId!, level) });
  } catch (err) {
    next(err);
  }
}

export async function claimAllController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.claimAll(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function leaderboardController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = (req.query.scope as "global" | "friends") ?? "global";
    res.json({ success: true, data: await service.getLeaderboard(req.userId!, scope) });
  } catch (err) {
    next(err);
  }
}
