/**
 * Domain string-union types used by the Mongoose models.
 *
 * These mirror the same types in the `@mystery-syndicate/shared` workspace
 * package (which the mobile app consumes). They are duplicated here so the
 * backend has ZERO build/runtime dependency on the shared package — the backend
 * folder can be built and deployed entirely on its own. Keep the two in sync if
 * you ever change the allowed values.
 */

export type CaseType =
  | "murder"
  | "theft"
  | "disappearance"
  | "sabotage"
  | "fraud";

export type CaseDifficulty = "easy" | "medium" | "hard" | "expert";

export type CaseStatus = "draft" | "scheduled" | "active" | "archived";

export type UserRank =
  | "rookie"
  | "junior_detective"
  | "detective"
  | "senior_detective"
  | "inspector"
  | "chief_inspector"
  | "legend";
