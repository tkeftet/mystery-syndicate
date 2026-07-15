import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as casesService from "./cases.service";
import { resolveLang } from "../../shared/localized";

export async function getTodayCaseController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const case_ = await casesService.getTodayCase(resolveLang(req));
    res.json({ success: true, data: case_ });
  } catch (err) {
    next(err);
  }
}

export async function getTodayMinisController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const cases = await casesService.getTodayMinis(resolveLang(req));
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
    const case_ = await casesService.getCaseById(req.params.id, resolveLang(req));
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
    const cases = await casesService.getRecentCases(req.userId!, resolveLang(req));
    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}
