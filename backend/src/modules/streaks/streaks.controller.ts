import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import { updateStreak } from "./streaks.service";

export async function updateStreakController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await updateStreak(req.userId!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
