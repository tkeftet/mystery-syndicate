import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./rankings.service";

export async function getDailyController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getDailyLeaderboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getWeeklyLeaderboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAllTimeController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getAllTimeLeaderboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getDetectiveOfTheWeekController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getDetectiveOfTheWeek();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMyRankController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getUserRank(req.userId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
