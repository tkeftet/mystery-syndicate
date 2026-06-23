import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./rewards.service";
import type { ShopItemId } from "./rewards.service";

export async function getShopController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const items = await service.getShopItems();
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function purchaseController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "itemId is required" },
      });
      return;
    }
    const result = await service.purchaseItem(
      req.userId!,
      itemId as ShopItemId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function equipController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.body;
    const result = await service.equipItem(req.userId!, itemId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
