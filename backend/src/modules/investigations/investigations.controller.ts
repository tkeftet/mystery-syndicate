import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./investigations.service";

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
    res.json({ success: true, data: result });
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
    res.json({ success: true, data: result });
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
