import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import {
  validate,
  registerSchema,
  loginSchema,
  refreshSchema,
} from "./auth.validator";

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { username, email, password } = validate(registerSchema, req.body);
    const { user, accessToken, refreshToken } = await authService.register(
      username,
      email,
      password,
    );

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          rank: user.rank,
          level: user.level,
          xp: user.xp,
          coins: user.coins,
          streak: user.streak,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { identifier, password } = validate(loginSchema, req.body);
    const { user, accessToken, refreshToken } = await authService.login(
      identifier,
      password,
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          rank: user.rank,
          level: user.level,
          xp: user.xp,
          coins: user.coins,
          streak: user.streak,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { refreshToken } = validate(refreshSchema, req.body);
    const tokens = await authService.refreshTokens(refreshToken);

    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function guestController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { user, accessToken, refreshToken } = await authService.createGuest();

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          isGuest: user.isGuest,
          avatar: user.avatar,
          rank: user.rank,
          level: user.level,
          xp: user.xp,
          coins: user.coins,
          streak: user.streak,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
