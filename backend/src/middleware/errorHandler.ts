import type { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors/AppError";
import { logger } from "../utils/logger";
import { captureException } from "../utils/monitoring";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // JWT errors → 401
  if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Token expired or invalid" },
    });
  }

  logger.error("Unhandled error:", err);
  captureException(err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}
