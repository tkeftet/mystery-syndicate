import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./seasons.service";

export async function listSeasonsController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ success: true, data: await service.listSeasons() });
  } catch (err) {
    next(err);
  }
}

export async function getSeasonController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ success: true, data: await service.getSeason(req.params.seasonId) });
  } catch (err) {
    next(err);
  }
}

export async function seasonMapController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getSeasonMap(req.userId!, req.params.seasonId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function myProgressController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getMyProgress(req.userId!, req.params.seasonId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function leaderboardController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getSeasonLeaderboard(req.params.seasonId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function startChapterController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.startChapter(
      req.userId!,
      req.params.seasonId,
      Number(req.params.n),
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function submitChapterController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { suspectId, motive, timelineEventId } = req.body ?? {};
    const data = await service.submitChapter(
      req.userId!,
      req.params.seasonId,
      Number(req.params.n),
      { suspectId, motive, timelineEventId },
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
