import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./dailyLogin.service";

export async function calendarController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getCalendar(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function claimController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.claimToday(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function analyticsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getLoginAnalytics() });
  } catch (err) {
    next(err);
  }
}
