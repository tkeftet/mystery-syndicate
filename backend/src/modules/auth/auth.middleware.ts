import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./auth.service";
import { User } from "../users/user.model";
import { UnauthorizedError } from "../../shared/errors/AppError";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select("_id isBanned");
    if (!user || user.isBanned) {
      throw new UnauthorizedError("User not found or banned");
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}
