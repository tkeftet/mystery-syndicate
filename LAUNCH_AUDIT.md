# Mystery Syndicate — Production Readiness Audit & Launch Plan

> Status: pre-launch audit. Grounded in the actual codebase (not the feature list).
> Last updated: 2026-06-22.

## Confirmed launch-critical facts (from code)
- **Daily-case content cliff**: `backend/src/modules/cases/cases.seed.ts` seeds only ~10 days of daily cases (offsets −3…+6, relative to seed time). `getTodayCase()` previously **threw** when a day had no case. → **Fixed** to fall back to the most recent published daily case; still needs a real content supply/pipeline.
- **Zero analytics** (no Firebase/Amplitude/PostHog/Segment).
- **Zero crash reporting** (no Sentry/Crashlytics); backend has `winston` only.
- **No `ErrorBoundary`** → **Fixed** (`mobile/src/components/ErrorBoundary.tsx`, wired in `App.tsx`).
- **AdMob still on TEST ad unit IDs** (`mobile/src/services/ads.ts` `REWARDED_AD_UNIT_ID` undefined).
- **No automated tests** beyond `backend/src/scripts/smoke.ts`.
- ~~**4 pre-existing backend TS errors**~~ **FIXED** (auth `jsonwebtoken` `expiresIn` typing ×2 via `SignOptions["expiresIn"]` cast; `case.model`/`user.model` now import types from `@mystery-syndicate/shared`). Backend type-check is now 0 errors and `yarn type-check` is green across all workspaces.

---

## 0. TL;DR — launch blockers
1. Daily-case content supply + generation pipeline (graceful fallback now in place).
2. Analytics SDK + activation/retention/ad funnels.
3. Crash reporting (Sentry mobile + backend).
4. ErrorBoundary / graceful failure (done) + offline/timeout handling.
5. Real AdMob IDs + UMP consent + iOS ATT.
6. Store assets + Privacy Policy + ToS + in-app account deletion.
7. Auth hardening (Apple Sign In if social; token/secret hygiene; rate-limit auth).

---

## Phase 1 — Product Audit (prioritized)
**P0 stability:** daily-case throw (fixed → fallback), no ErrorBoundary (fixed), 4 backend TS errors, no request timeouts/offline handling.
**P1 UX/churn:** onboarding is auth-intro slides not an interactive first case; avatar shape inconsistency (Home circle vs Profile/Customize square); verify empty states everywhere; verify push deep-links route on tap.
**P2:** retention/monetization polish (Phases 7–8).
**Strengths:** `Promise.allSettled` progression fan-out, single-flight JWT refresh, helmet + rate limit, isolated schedulers, server-authoritative dates/anti-cheat.

## Phase 2 — Launch Checklist
- **Account:** ~~deletion (required)~~ **DONE** (`DELETE /users/me` + Privacy Settings "Delete account" flow; full cascade verified), guest→permanent linking, Apple Sign In (if social), password reset, email-optional handling.
- **Gameplay:** daily case never errors (done), re-entrancy guards, victim/briefing on all case kinds (done).
- **Ads:** real IDs, UMP/GDPR consent, iOS ATT, SSV verified in prod, frequency caps, no-fill handling.
- **Notifications:** permission priming, deep-link routing, quiet hours/opt-out, `CRON_TZ` set.
- **Security:** secrets in env/secret manager, JWT secret strength + short TTL + refresh rotation, per-route rate limits, Atlas IP allowlist + least-privilege + backups, input validation (zod) on writes.
- **Backend:** health/readiness endpoint, log shipping, graceful shutdown, idempotent claims.
- **Testing:** smoke + typecheck in CI; unit tests for scoring/leveling/streak/login/unlock; manual QA matrix.
- **Compliance:** Privacy Policy + ToS, Data Safety (Play) + Privacy labels (Apple), age rating (likely Teen/12+), 13+ gate.

## Phase 3 — Analytics
SDK: PostHog or Amplitude (+ backend forwarding for reward/anti-cheat events).
Convention: `snake_case`, `object_action`, past tense; always attach `user_id, level, is_guest, app_version, platform, session_id`.
Events: `user_registered`, `tutorial_step_completed`/`tutorial_completed`, `case_started`/`case_completed`, `story_chapter_started`/`_completed`, `season_progress`, `reward_claimed`, `daily_login_claimed`, `agency_action`, `friend_request_sent`/`_accepted`, `ad_requested`/`ad_shown`/`ad_completed`/`ad_failed`, IAP events later.
Funnels: install→register→tutorial→first case (activation); daily-login D0→D1→D7; ad request→complete; guest→linked.
KPIs: DAU/WAU/MAU, D1/D7/D30 cohorted, activation rate, session length & sessions/day, login claim rate, ad completion, ARPDAU, crash-free %.

## Phase 4 — Crash & Monitoring
Sentry RN (crashes + JS errors + release health + source maps) wired into ErrorBoundary; Sentry/winston→Datadog/Logtail on backend with error-rate alerts; Sentry perf traces for screen TTI + slow API; uptime/latency on `/health`; Expo push ticket/receipt error logging; ad fill/`ad_failed` tracking; host + Mongo Atlas slow-query alerts.

## Phase 5 — Content
Daily previously ~10 days; targets: **90 days** of daily at launch + pipeline keeping ≥30 days runway (LLM-generated + human QA, or tooling→import); 30+ minis; 1 full story arc (8–12 ch) + a 2nd staged; 8–12 mega cases queued; 1 full season + next staged. Safety net: fallback to an unsolved case if today's missing (**implemented**). Track "weeks of runway" + alert <30 days.

## Phase 6 — Onboarding
Guest auto-start → interactive tutorial case (guided inspect→review→accuse → guaranteed solve + reward) → immediate reward popup → surface Case of the Day + notification priming. Gate seasons/agencies behind level with teaser cards. Remove mandatory email at start and pre-value permission prompts.

## Phase 7 — Retention
D1: tutorial completion + first reward + notif opt-in + reason to return (login Day 2 preview). D7: daily login (built), streaks + streak-save push, weekly mega cadence, friends; visible Day-7 milestone. D30: seasons/pass, collections/achievements, agencies, story arcs; mitigate content exhaustion + low-population agency emptiness. Cross-cutting: deep-link push to exact screen; "what's new" recap after 3+ days away.

## Phase 8 — Monetization
Rewarded ads (live): add double-login-reward, second daily case via ad, careful continue-after-wrong; frequency caps; SSV-only (done). Add **premium Season Pass (IAP)** + receipt validation (biggest revenue lever). Cosmetic direct-buy (coins now, premium currency later). Model coins-in vs coins-out so cosmetics stay aspirational. Keep ads opt-in/rewarded only.

## Phase 9 — Performance
Startup: lazy-init ads/notifications post-first-paint, skeletons. Network: tune staleTime/gcTime, `select` to trim payloads, timeouts. Images: vector now; future art optimized + `expo-image`. DB: compound indexes for leaderboard/agency/cases(availableDate+kind+status)/investigation(userId+status); `.lean()` on reads; paginate + cache top-N leaderboard/agency; avoid N+1 in showcase/friends.

## Phase 10 — Store Readiness
Name w/ keyword; subtitle "Solve a new mystery every day."; ASO keywords (detective/mystery/crime/investigation/whodunit/puzzle/case/sleuth/clue); 6–8 captioned screenshots/platform; feature graphic (Play 1024×500); app icon all sizes; optional preview video; Privacy Policy + ToS URLs; Data Safety + Privacy labels (AdMob = data + tracking → ATT); age rating Teen/12+; account deletion link; Apple: Sign in with Apple if social + ATT + demo account; Play: current target API + closed testing track.

## Phase 11 — Soft Launch
10 (alpha, TestFlight/internal): crashes, daily loop surviving >7 days, tutorial completion, data integrity. 100 (closed beta): one geo/community + in-app feedback; watch D1/D7, activation, funnels; iterate weekly. 1000 (soft-launch geo): D30, cohort retention, ARPDAU, runway, load; P0 hotfix <24h; weekly content cadence. Gate global on D1≥~35%, D7≥~15%.

## Phase 12 — Roadmap
🔴 Critical: content supply+pipeline (fallback done); Sentry+ErrorBoundary(done); analytics+funnels; AdMob IDs+UMP+ATT; Privacy/ToS/deletion/labels; auth hardening; fix 4 TS errors + CI.
🟠 High: interactive tutorial; store assets; DB index/caching; settings (notif opt-out, account mgmt); QA matrix + unit tests.
🟡 Medium: premium pass (IAP) + cosmetic buy; push deep-link routing; offline/timeouts/skeletons; economy modeling.
🟢 Low: preview video/ASO, more arcs/cosmetics/agency chat, localization.
Sequencing: W1–2 critical; W3–4 high + alpha(10); W5–6 beta(100); W7–8 soft-launch geo(1000); global when retention gates pass.

---

## Done in this pass
- Daily-case graceful fallback (`cases.service.getTodayCase` no longer throws on a content gap).
- `ErrorBoundary` added and wired at the app root (`mobile/App.tsx`).
- **Analytics layer** (`mobile/src/services/analytics.ts`): provider-agnostic `track`/`identify`/`resetAnalytics` with one integration point (`setAnalyticsSink`) — drop in PostHog/Amplitude at launch with zero call-site changes. Day-one funnels wired: `user_registered`/`user_logged_in` (email + guest), `tutorial_completed`, `case_started`, `case_completed`, `story_chapter_completed`, `daily_login_claimed`, `ad_requested`/`ad_completed`/`ad_failed`. Defaults to dev logging + a 100-event buffer until a sink is attached.
  - **Remaining for analytics:** pick a provider, `expo install` its SDK, implement an `AnalyticsSink`, call `setAnalyticsSink(...)` in `App.tsx`; optionally wire `reward_claimed`, `friend_request_sent`, `agency_action`.
- **Sentry crash/error monitoring** — guarded integration, no-op until installed + DSN set.
  - Mobile (`mobile/src/services/monitoring.ts`): `initMonitoring` (App init), `captureException` (wired into `ErrorBoundary`), `setMonitoringUser`/`clearMonitoringUser` (wired into auth store).
  - Backend (`backend/src/utils/monitoring.ts`): `initMonitoring` (server boot), `captureException` (wired into the global error handler for 5xx/unknown).
  - **Activation (mobile):** `npx expo install @sentry/react-native` → add its config plugin to `app.json` `plugins` → set `extra.sentryDsn` in `app.json` (or EAS env). **(backend):** `yarn add @sentry/node` → set `SENTRY_DSN` env. No code changes needed after that.
  - **DONE:** mobile DSN set in `app.json`; backend `@sentry/node` installed + `SENTRY_DSN` in `backend/.env`, verified live (test event flushed). Mobile activates on next native rebuild.
- **AdMob (Android) live + Google UMP consent**:
  - Real Android App ID in `app.json` and real rewarded ad unit in `ads.ts` (dev still uses Google TestIds; iOS still on test until an iOS AdMob app exists).
  - UMP consent flow wired in `ads.ts` `gatherConsent()` (runs before SDK init); `requestNonPersonalizedAdsOnly` removed so the SDK honors consent. "Manage ad privacy" entry added to Privacy Settings (`showAdPrivacyOptions`).
  - **Remaining:** configure a consent message in AdMob "Privacy & messaging" (EEA + a debug geography for testing); add iOS App ID + rewarded unit + Apple ATT when iOS is set up; declare ads in Play Data Safety / Apple privacy labels. Real ads only serve in a native build. **DONE:** EU GDPR consent message created + published in AdMob (needs payment profile completed before real ads serve).
- **Legal docs** drafted: `docs/privacy-policy.md`, `docs/terms-of-service.md` (replace `[YOUR_CONTACT_EMAIL]`, host them, reuse URLs for AdMob consent + both store listings).
- **Content runway pipeline** (avoids daily-loop starvation):
  - `yarn content:status` — reports contiguous daily-case runway from today + mini/mega/chapter counts; warns <30 days, **exits non-zero <7 days** (CI/cron-friendly). `backend/src/scripts/content-status.ts`.
  - `yarn content:import <file.json>` — validates authored cases (required fields + solution integrity) and upserts idempotently; **aborts entirely on any validation error** (verified). `backend/src/scripts/content-import.ts`. Authoring format: `docs/sample-cases.json`.
  - ~~**FINDING:** daily runway is currently **0**~~ **PARTIALLY FIXED (2026-06-23):** authored + imported a 30-day daily batch (`backend/content/daily-cases-batch-01.json`, 2026-06-23→2026-07-22; all 5 crime types; difficulty curve easy 3 / medium 12 / hard 10 / expert 5; each fair-play with a red herring + supported solution). `content:status` now reports **30 days** and exits 0. **Remaining:** extend toward the 90-day target (author batch-02+), seed minis (`content:status` shows minis=0), and run `content:status` in a daily cron to alert before gaps.
- **Baseline TS errors fixed + CI workflow added.** All 4 long-standing backend type errors resolved; added `mobile` `type-check` script + `shared/tsconfig.json` so root `yarn type-check` is green across mobile+backend+shared. New `.github/workflows/ci.yml`: type-checks all workspaces on push/PR, plus an optional backend smoke job that runs when a `MONGODB_URI` repo secret is set (throwaway DB, dropped after). NOTE: repo isn't a git repo yet — `git init` + push to GitHub to activate CI.
