import Constants from "expo-constants";

/**
 * Crash & error monitoring (Sentry) — guarded integration.
 *
 * The native SDK is lazy-required (like ads.ts) so the app runs fine whether or
 * not `@sentry/react-native` is installed, and stays a no-op until a DSN is
 * configured. This keeps typecheck/build green now; activation is just:
 *
 *   1) npx expo install @sentry/react-native
 *   2) add the Sentry config plugin to app.json `plugins`
 *   3) set `extra.sentryDsn` in app.json (or EAS env)
 *
 * All capture points (ErrorBoundary, auth user context, app init) are already
 * wired — no further code changes needed to turn it on.
 */

declare const __DEV__: boolean;

function loadSentry(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@sentry/react-native");
  } catch {
    return null;
  }
}

const dsn = (Constants.expoConfig?.extra as any)?.sentryDsn as string | undefined;
const release = (Constants.expoConfig?.version as string | undefined) ?? "0.0.0";
let enabled = false;

export function initMonitoring(): void {
  if (enabled) return;
  const Sentry = loadSentry();
  if (!Sentry || !dsn) return; // not installed / not configured → no-op
  try {
    Sentry.init({
      dsn,
      release,
      enableNative: true,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? "development" : "production",
    });
    enabled = true;
  } catch (err) {
    console.warn("Sentry init failed:", err);
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const Sentry = loadSentry();
  try {
    Sentry?.captureException?.(
      error,
      context ? { extra: context } : undefined,
    );
  } catch {
    /* monitoring must never throw */
  }
  if (!enabled && __DEV__) console.error("[monitoring]", error, context ?? "");
}

export function setMonitoringUser(
  id: string,
  data?: Record<string, unknown>,
): void {
  const Sentry = loadSentry();
  try {
    Sentry?.setUser?.({ id, ...data });
  } catch {
    /* noop */
  }
}

export function clearMonitoringUser(): void {
  const Sentry = loadSentry();
  try {
    Sentry?.setUser?.(null);
  } catch {
    /* noop */
  }
}
