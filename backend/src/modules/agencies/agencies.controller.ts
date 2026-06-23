import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./agencies.service";

const target = (req: AuthRequest) => String(req.body?.userId ?? "");

export async function listController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? "");
    const page = Number(req.query.page ?? 1);
    res.json({ success: true, data: await service.listAgencies(q, page) });
  } catch (err) {
    next(err);
  }
}

export async function createController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.createAgency(req.userId!, req.body ?? {}) });
  } catch (err) {
    next(err);
  }
}

export async function myAgencyController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getMyAgency(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function leaderboardController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = (req.query.scope as "weekly" | "global") ?? "weekly";
    res.json({ success: true, data: await service.getLeaderboard(scope) });
  } catch (err) {
    next(err);
  }
}

export async function getAgencyController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getAgencyView(req.params.id, req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function joinController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.joinAgency(req.userId!, req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function leaveController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.leaveAgency(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function requestsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.listRequests(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function approveController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.approveRequest(req.userId!, target(req)) });
  } catch (err) {
    next(err);
  }
}

export async function rejectController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.rejectRequest(req.userId!, target(req)) });
  } catch (err) {
    next(err);
  }
}

export async function setRoleController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({
      success: true,
      data: await service.setRole(req.userId!, target(req), req.body?.role),
    });
  } catch (err) {
    next(err);
  }
}

export async function kickController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.kickMember(req.userId!, target(req)) });
  } catch (err) {
    next(err);
  }
}

export async function transferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.transferLeadership(req.userId!, target(req)) });
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.deleteAgency(req.userId!) });
  } catch (err) {
    next(err);
  }
}
