import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Provider-agnostic analytics layer.
 *
 * Everything goes through `track()` / `identify()`. There is ONE integration
 * point — `setAnalyticsSink()` — so you can drop in PostHog / Amplitude / Segment
 * at launch without touching any call sites. Until a sink is set, events are
 * logged in dev and buffered (last 100) so nothing is lost and QA can verify
 * instrumentation. Every call is wrapped so analytics can never crash the app.
 *
 * Event taxonomy + naming convention (snake_case, object_action, past tense for
 * completions) mirrors LAUNCH_AUDIT.md Phase 3.
 */

export const AnalyticsEvent = {
  USER_REGISTERED: "user_registered",
  USER_LOGGED_IN: "user_logged_in",
  TUTORIAL_COMPLETED: "tutorial_completed",
  CASE_STARTED: "case_started",
  CASE_COMPLETED: "case_completed",
  STORY_CHAPTER_COMPLETED: "story_chapter_completed",
  DAILY_LOGIN_CLAIMED: "daily_login_claimed",
  REWARD_CLAIMED: "reward_claimed",
  AD_REQUESTED: "ad_requested",
  AD_COMPLETED: "ad_completed",
  AD_FAILED: "ad_failed",
  FRIEND_REQUEST_SENT: "friend_request_sent",
  AGENCY_ACTION: "agency_action",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type Props = Record<string, unknown>;

export interface AnalyticsSink {
  identify: (userId: string, traits: Props) => void;
  track: (event: string, props: Props) => void;
  reset: () => void;
}

declare const __DEV__: boolean;

const appVersion =
  (Constants.expoConfig?.version as string | undefined) ?? "0.0.0";

const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let sink: AnalyticsSink | null = null;
let superProps: Props = { platform: Platform.OS, app_version: appVersion };
const buffer: Array<{ event: string; props: Props; ts: number }> = [];

/** Wire a real provider at app start, e.g. setAnalyticsSink(posthogSink). */
export function setAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

/** Properties attached to every event (merged with per-event props). */
export function setSuperProps(props: Props): void {
  superProps = { ...superProps, ...props };
}

export function identify(userId: string, traits: Props = {}): void {
  try {
    setSuperProps({ is_guest: traits.is_guest, level: traits.level });
    sink?.identify(userId, traits);
    if (__DEV__ && !sink) console.log("[analytics] identify", userId, traits);
  } catch {
    /* analytics must never throw */
  }
}

export function track(event: AnalyticsEventName, props: Props = {}): void {
  try {
    const enriched = { ...superProps, session_id: sessionId, ...props };
    if (sink) {
      sink.track(event, enriched);
    } else {
      buffer.push({ event, props: enriched, ts: Date.now() });
      if (buffer.length > 100) buffer.shift();
      if (__DEV__) console.log("[analytics]", event, props);
    }
  } catch {
    /* analytics must never throw */
  }
}

/** Call on sign-out so the next user isn't attributed to the previous one. */
export function resetAnalytics(): void {
  try {
    sink?.reset();
  } catch {
    /* noop */
  }
}

/** For QA/debug: events captured before a sink was attached. */
export function getBufferedEvents() {
  return [...buffer];
}
