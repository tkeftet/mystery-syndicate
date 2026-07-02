import type { Request, Response, NextFunction } from "express";
import { User } from "../users/user.model";
import { sendToTokens } from "./notifications.service";

/**
 * Dev-only manual push trigger. Sends a test notification to every registered
 * device and reports how many tokens are stored (0 ⇒ registration didn't reach
 * the backend). Mounted only when NODE_ENV !== "production" (see app.ts).
 */
export async function testPushController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const users = await User.find({ pushToken: { $ne: null } }).select(
      "pushToken",
    );
    const tokens = users
      .map((u) => u.pushToken)
      .filter((t): t is string => !!t);

    await sendToTokens(tokens, {
      title: "🔔 Mystery Syndicate test",
      body: "Push notifications are working! 🎉",
      data: { type: "test" },
    });

    res.json({ success: true, registeredDevices: tokens.length });
  } catch (err) {
    next(err);
  }
}
