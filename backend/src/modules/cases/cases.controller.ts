import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as casesService from "./cases.service";

export async function getTodayCaseController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const case_ = await casesService.getTodayCase();
    res.json({ success: true, data: case_ });
  } catch (err) {
    next(err);
  }
}

export async function getTodayMinisController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const cases = await casesService.getTodayMinis();
    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}

export async function getCaseByIdController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const case_ = await casesService.getCaseById(req.params.id);
    res.json({ success: true, data: case_ });
  } catch (err) {
    next(err);
  }
}

export async function getRecentCasesController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const cases = await casesService.getRecentCases(req.userId!);
    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}
