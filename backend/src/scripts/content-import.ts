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
import { resolveLocalized, SUPPORTED_LANGS } from "../shared/localized";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A localizable text field is a non-empty string OR a { en?, fr?, ar? } object
// with at least one non-empty language value.
function okText(v: any): boolean {
  if (typeof v === "string") return v.trim().length > 0;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return SUPPORTED_LANGS.some(
      (l) => typeof v[l] === "string" && v[l].trim().length > 0,
    );
  }
  return false;
}

function validateCase(c: any, i: number): string[] {
  const errs: string[] = [];
  const label = resolveLocalized(c?.title, "en") || "untitled";
  const at = (msg: string) => `case[${i}] (${label}): ${msg}`;

  for (const f of ["title", "description"]) {
    if (!okText(c?.[f])) errs.push(at(`missing "${f}"`));
  }
  for (const f of ["type", "difficulty"]) {
    if (!c?.[f] || typeof c[f] !== "string") errs.push(at(`missing "${f}"`));
  }
  const kind = c?.kind ?? "daily";
  if ((kind === "daily" || kind === "mini") && !DATE_RE.test(c?.availableDate ?? ""))
    errs.push(at(`"availableDate" must be YYYY-MM-DD for kind "${kind}"`));
  if (typeof c?.estimatedMinutes !== "number") errs.push(at(`"estimatedMinutes" must be a number`));
  if (typeof c?.maxScore !== "number") errs.push(at(`"maxScore" must be a number`));

  if (!okText(c?.victim?.name) || !okText(c?.victim?.description))
    errs.push(at(`"victim" needs name + description`));

  const suspects = Array.isArray(c?.suspects) ? c.suspects : [];
  if (suspects.length < 2) errs.push(at(`needs at least 2 suspects`));
  for (const s of suspects) {
    if (!s?.id) errs.push(at(`suspect "?" missing "id"`));
    for (const f of ["name", "description", "alibi", "relationship"]) {
      if (!okText(s?.[f])) errs.push(at(`suspect "${s?.id ?? "?"}" missing "${f}"`));
    }
  }
  const evidence = Array.isArray(c?.evidence) ? c.evidence : [];
  if (evidence.length < 1) errs.push(at(`needs at least 1 evidence item`));
  for (const e of evidence) {
    if (!e?.id) errs.push(at(`evidence "?" missing "id"`));
    if (!e?.type) errs.push(at(`evidence "${e?.id ?? "?"}" missing "type"`));
    for (const f of ["title", "description"]) {
      if (!okText(e?.[f])) errs.push(at(`evidence "${e?.id ?? "?"}" missing "${f}"`));
    }
  }
  const timeline = Array.isArray(c?.timeline) ? c.timeline : [];
  if (timeline.length < 1) errs.push(at(`needs at least 1 timeline event`));
  for (const t of timeline) {
    if (!t?.id) errs.push(at(`timeline "?" missing "id"`));
    for (const f of ["time", "description"]) {
      if (!okText(t?.[f])) errs.push(at(`timeline "${t?.id ?? "?"}" missing "${f}"`));
    }
  }

  const sol = c?.solution;
  if (!sol) errs.push(at(`missing "solution"`));
  else {
    // suspectId/timelineEventId are plain id strings; motive/explanation are
    // localizable (plain string or { en, fr?, ar? }).
    for (const f of ["suspectId", "timelineEventId"]) {
      if (!sol[f] || typeof sol[f] !== "string") errs.push(at(`solution missing "${f}"`));
    }
    if (!okText(sol.motive)) errs.push(at(`solution missing "motive"`));
    if (!okText(sol.explanation)) errs.push(at(`solution missing "explanation"`));
    if (sol.suspectId && !suspects.some((s: any) => s.id === sol.suspectId))
      errs.push(at(`solution.suspectId "${sol.suspectId}" doesn't match any suspect`));
    if (sol.timelineEventId && !timeline.some((t: any) => t.id === sol.timelineEventId))
      errs.push(at(`solution.timelineEventId "${sol.timelineEventId}" doesn't match any timeline event`));
  }

  // Mega/chapter cases offer motive + weapon choices; each option is localizable
  // and the solution values must appear among them (after resolving to English).
  const kindNeedsOptions = kind === "mega" || kind === "chapter";
  if (kindNeedsOptions || c?.megaOptions) {
    const mo = c?.megaOptions;
    const motives = Array.isArray(mo?.motives) ? mo.motives : [];
    const weapons = Array.isArray(mo?.weapons) ? mo.weapons : [];
    if (kindNeedsOptions && motives.length < 2)
      errs.push(at(`megaOptions.motives needs at least 2 choices for kind "${kind}"`));
    if (motives.some((m: any) => !okText(m)))
      errs.push(at(`megaOptions.motives has an empty choice`));
    if (weapons.some((w: any) => !okText(w)))
      errs.push(at(`megaOptions.weapons has an empty choice`));
    // The solution's motive/weapon must be one of the offered options (English).
    const enOf = (v: any) => resolveLocalized(v, "en").trim().toLowerCase();
    if (sol?.motive && motives.length > 0) {
      const solM = enOf(sol.motive);
      if (!motives.some((m: any) => enOf(m) === solM))
        errs.push(at(`solution.motive isn't among megaOptions.motives`));
    }
    if (sol?.weapon && weapons.length > 0) {
      const solW = enOf(sol.weapon);
      if (!weapons.some((w: any) => enOf(w) === solW))
        errs.push(at(`solution.weapon isn't among megaOptions.weapons`));
    }
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
    // Non-daily cases are keyed by title. Title may be localized ({en,...}) or a
    // plain string, so match on the resolved English title against either shape.
    const enTitle = resolveLocalized(doc.title, "en");
    const filter =
      doc.kind === "daily" || doc.kind === "mini"
        ? { kind: doc.kind, availableDate: doc.availableDate }
        : { kind: doc.kind, $or: [{ title: enTitle }, { "title.en": enTitle }] };
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
