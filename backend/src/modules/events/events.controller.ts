import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import { resolveLang, localizeDeep } from "../../shared/localized";
import * as service from "./events.service";

// Event/case reads return RAW ({en,fr,ar}); the app resolves per language. Only
// the submit response (a transient mutation result) is resolved server-side.

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
    const lang = resolveLang(req);
    const result = await service.submitEvent(
      req.userId!,
      req.params.eventId,
      { suspectId, motive, weapon, timelineEventId },
      lang,
    );
    res.json({ success: true, data: localizeDeep(result, lang) });
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
