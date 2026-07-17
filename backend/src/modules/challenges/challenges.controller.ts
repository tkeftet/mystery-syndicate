import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./challenges.service";

export async function listController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Challenge title/description are returned RAW ({en,fr,ar}); the app resolves
    // them per language on render.
    const data = await service.getChallenges(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function claimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const key = String(req.body?.key ?? "");
    res.json({ success: true, data: await service.claimChallenge(req.userId!, key) });
  } catch (err) {
    next(err);
  }
}

export async function claimAllController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.claimAllChallenges(req.userId!) });
  } catch (err) {
    next(err);
  }
}
