/**
 * Bulk-import authored cases from a JSON file.  Run:
 *   yarn content:import path/to/cases.json
 *
 * The file is an array of case objects (same shape the seeds build). Every case
 * is validated FIRST (required fields + solution integrity); if any case is
 * invalid the whole import aborts with a non-zero exit, so malformed content
 * never reaches the database. Valid cases are upserted idempotently:
 *   - daily/mini: keyed by (kind, availableDate)  — one per day
 *   - others:     keyed by (kind, title)
 *
 * This is the "never run out of daily content" pipeline: author cases in a JSON
 * file (by hand or generated), validate + import here, and `content:status`
 * tracks the remaining runway.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { logger } from "../utils/logger";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateCase(c: any, i: number): string[] {
  const errs: string[] = [];
  const at = (msg: string) => `case[${i}] (${c?.title ?? "untitled"}): ${msg}`;

  for (const f of ["title", "description", "type", "difficulty"]) {
    if (!c?.[f] || typeof c[f] !== "string") errs.push(at(`missing "${f}"`));
  }
  const kind = c?.kind ?? "daily";
  if ((kind === "daily" || kind === "mini") && !DATE_RE.test(c?.availableDate ?? ""))
    errs.push(at(`"availableDate" must be YYYY-MM-DD for kind "${kind}"`));
  if (typeof c?.estimatedMinutes !== "number") errs.push(at(`"estimatedMinutes" must be a number`));
  if (typeof c?.maxScore !== "number") errs.push(at(`"maxScore" must be a number`));

  if (!c?.victim?.name || !c?.victim?.description) errs.push(at(`"victim" needs name + description`));

  const suspects = Array.isArray(c?.suspects) ? c.suspects : [];
  if (suspects.length < 2) errs.push(at(`needs at least 2 suspects`));
  for (const s of suspects) {
    for (const f of ["id", "name", "description", "alibi", "relationship"]) {
      if (!s?.[f]) errs.push(at(`suspect "${s?.id ?? "?"}" missing "${f}"`));
    }
  }
  const evidence = Array.isArray(c?.evidence) ? c.evidence : [];
  if (evidence.length < 1) errs.push(at(`needs at least 1 evidence item`));
  for (const e of evidence) {
    for (const f of ["id", "title", "description", "type"]) {
      if (!e?.[f]) errs.push(at(`evidence "${e?.id ?? "?"}" missing "${f}"`));
    }
  }
  const timeline = Array.isArray(c?.timeline) ? c.timeline : [];
  if (timeline.length < 1) errs.push(at(`needs at least 1 timeline event`));
  for (const t of timeline) {
    for (const f of ["id", "time", "description"]) {
      if (!t?.[f]) errs.push(at(`timeline "${t?.id ?? "?"}" missing "${f}"`));
    }
  }

  const sol = c?.solution;
  if (!sol) errs.push(at(`missing "solution"`));
  else {
    for (const f of ["suspectId", "motive", "timelineEventId", "explanation"]) {
      if (!sol[f]) errs.push(at(`solution missing "${f}"`));
    }
    if (sol.suspectId && !suspects.some((s: any) => s.id === sol.suspectId))
      errs.push(at(`solution.suspectId "${sol.suspectId}" doesn't match any suspect`));
    if (sol.timelineEventId && !timeline.some((t: any) => t.id === sol.timelineEventId))
      errs.push(at(`solution.timelineEventId "${sol.timelineEventId}" doesn't match any timeline event`));
  }
  return errs;
}

function normalize(c: any) {
  const kind = c.kind ?? "daily";
  return {
    ...c,
    kind,
    status: c.status ?? "active",
    victim: { avatar: "default_victim", ...c.victim },
    suspects: c.suspects.map((s: any) => ({ avatar: "default_suspect", ...s })),
    evidence: c.evidence.map((e: any) => ({ isRedHerring: false, ...e })),
    witnessStatements: c.witnessStatements ?? [],
  };
}

async function run() {
  const arg = process.argv[2];
  if (!arg) {
    logger.error("Usage: yarn content:import <path/to/cases.json>");
    process.exit(1);
  }
  const file = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(file)) {
    logger.error(`File not found: ${file}`);
    process.exit(1);
  }

  let data: any;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e: any) {
    logger.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    logger.error("Top-level JSON must be an array of case objects.");
    process.exit(1);
  }

  // ── Validate everything first ──
  const allErrors = data.flatMap((c, i) => validateCase(c, i));
  if (allErrors.length > 0) {
    logger.error(`Validation failed (${allErrors.length} issue(s)) — nothing imported:`);
    allErrors.forEach((e) => logger.error(`  • ${e}`));
    process.exit(1);
  }

  // ── Import (upsert, idempotent) ──
  await connectDatabase();
  let created = 0;
  let updated = 0;
  for (const raw of data) {
    const doc = normalize(raw);
    const filter =
      doc.kind === "daily" || doc.kind === "mini"
        ? { kind: doc.kind, availableDate: doc.availableDate }
        : { kind: doc.kind, title: doc.title };
    const res = await Case.updateOne(filter, { $set: doc }, { upsert: true });
    if (res.upsertedCount && res.upsertedCount > 0) created++;
    else updated++;
  }

  logger.info(`Content import complete: ${created} created, ${updated} updated (${data.length} total).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error("content:import failed:", err);
  process.exit(1);
});
