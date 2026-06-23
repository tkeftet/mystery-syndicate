import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";
import * as service from "./friends.service";

const targetId = (req: AuthRequest) => String(req.body?.userId ?? "");

export async function sendRequestController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.sendRequest(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function acceptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.acceptRequest(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function rejectController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.rejectRequest(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function cancelController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.cancelRequest(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function removeController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.removeFriend(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function blockController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.blockUser(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function unblockController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.unblockUser(req.userId!, targetId(req)) });
  } catch (err) {
    next(err);
  }
}

export async function listFriendsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sort = (req.query.sort as any) ?? "online";
    res.json({ success: true, data: await service.listFriends(req.userId!, sort) });
  } catch (err) {
    next(err);
  }
}

export async function listRequestsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.listRequests(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function searchController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? "");
    const page = Number(req.query.page ?? 1);
    res.json({ success: true, data: await service.searchUsers(req.userId!, q, page) });
  } catch (err) {
    next(err);
  }
}

export async function getPrivacyController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getPrivacy(req.userId!) });
  } catch (err) {
    next(err);
  }
}

export async function updatePrivacyController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.updatePrivacy(req.userId!, req.body ?? {}) });
  } catch (err) {
    next(err);
  }
}

export async function heartbeatController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.touchPresence(req.userId!) });
  } catch (err) {
    next(err);
  }
}
