import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./events.service";

export async function listEventsController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const events = await service.listEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

export async function globalLeaderboardController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const board = await service.getGlobalEventLeaderboard();
    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

export async function getEventController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const event = await service.getEvent(req.params.eventId);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

export async function participateController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.participate(req.userId!, req.params.eventId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { suspectId, motive, weapon, timelineEventId } = req.body ?? {};
    const result = await service.submitEvent(req.userId!, req.params.eventId, {
      suspectId,
      motive,
      weapon,
      timelineEventId,
    });
    res.json({ success: true, data: result });
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
    const board = await service.getEventLeaderboard(req.params.eventId);
    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

export async function myParticipationController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await service.getMyParticipation(
      req.userId!,
      req.params.eventId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
