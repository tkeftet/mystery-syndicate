import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./cosmetics.service";

export async function customizationController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getCustomization(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function equipController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = String(req.body?.category ?? "");
    const id = req.body?.id ?? null;
    res.json({
      success: true,
      data: await service.equipCosmetic(req.userId!, category, id === null ? null : String(id)),
    });
  } catch (err) {
    next(err);
  }
}

export async function likeController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.toggleLike(req.userId!, req.params.userId) });
  } catch (err) {
    next(err);
  }
}

export async function analyticsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getCosmeticsAnalytics() });
  } catch (err) {
    next(err);
  }
}
