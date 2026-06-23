import { logger } from "./logger";

/**
 * Backend error monitoring (Sentry) — guarded integration.
 *
 * `@sentry/node` is lazy-required so the server runs whether or not it's
 * installed, and stays a no-op until `SENTRY_DSN` is set. Activation:
 *
 *   1) yarn add @sentry/node
 *   2) set SENTRY_DSN in the environment
 *
 * `initMonitoring()` is called at boot; `captureException()` is wired into the
 * global error handler for 5xx/unknown errors.
 */

let Sentry: any = null;
let enabled = false;

export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // not configured → no-op
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.2,
    });
    enabled = true;
    logger.info("Sentry monitoring initialized.");
  } catch (err) {
    logger.warn("Sentry init skipped (package not installed?):", err);
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled || !Sentry) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* monitoring must never throw */
  }
}
