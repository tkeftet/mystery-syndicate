import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User } from "../users/user.model";
import { ConflictError, UnauthorizedError } from "../../shared/errors/AppError";

// ── Token helpers ────────────────────────────────────────────────────────────

// `expiresIn` from env is a plain string; @types/jsonwebtoken wants its branded
// `number | StringValue` type, so we cast through the SignOptions field type.
type ExpiresIn = SignOptions["expiresIn"];

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? "15m") as ExpiresIn,
  });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? "30d") as ExpiresIn,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
}

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(
  username: string,
  email: string,
  password: string,
) {
  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    if (existing.username === username) {
      throw new ConflictError("Username already taken");
    }
    throw new ConflictError("Email already in use");
  }

  const user = await User.create({
    username,
    email,
    passwordHash: password, // hashed by pre-save hook
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.isBanned) {
    throw new UnauthorizedError("Account suspended");
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

// ── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshTokens(token: string) {
  let payload: { sub: string };

  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isBanned) {
    throw new UnauthorizedError("User not found");
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { accessToken, refreshToken };
}

// ── Guest Mode ───────────────────────────────────────────────────────────────

export async function createGuest() {
  const guestId = uuidv4().slice(0, 8);

  const user = await User.create({
    username: `guest_${guestId}`,
    isGuest: true,
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}
