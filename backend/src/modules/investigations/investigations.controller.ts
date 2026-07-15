import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./investigations.service";
import { resolveLang, localizeDeep } from "../../shared/localized";

export async function startController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const inv = await service.startInvestigation(
      req.userId!,
      req.params.caseId,
    );
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
}

export async function submitAccusationController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.submitAccusation(
      req.userId!,
      req.params.caseId,
      req.body.suspectId,
      req.body.motive,
    );
    // Resolve embedded case text (solution explanation, red-herring titles) to
    // the caller's language before returning.
    res.json({ success: true, data: localizeDeep(result, resolveLang(req)) });
  } catch (err) {
    next(err);
  }
}

export async function getInvestigationController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const inv = await service.getInvestigation(req.userId!, req.params.caseId);
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
}

export async function useHintController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.useHint(req.userId!, req.params.caseId);
    // clearedSuspect.name may be a localized object — resolve it.
    res.json({ success: true, data: localizeDeep(result, resolveLang(req)) });
  } catch (err) {
    next(err);
  }
}

export async function adRewardController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const inv = await service.redeemAdReward(
      req.userId!,
      req.params.caseId,
      req.body.type,
    );
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
}

export async function syncProgressController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const inv = await service.syncProgress(
      req.userId!,
      req.params.caseId,
      req.body,
    );
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
}
