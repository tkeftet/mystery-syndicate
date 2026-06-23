/**
 * Content runway report.  Run:  yarn content:status
 *
 * The daily case is the core loop. `getTodayCase()` now falls back to the most
 * recent published case if a day is missing (so it never errors), but a gap
 * still means players see a REPEAT. This script reports how many consecutive
 * days of fresh daily content exist starting today, plus mini/mega counts, and
 * exits non-zero when the runway is critically low — so it can run in CI or a
 * cron and alert you BEFORE players run out of content.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { logger } from "../utils/logger";

const WARN_DAYS = 30; // below this: warn
const CRITICAL_DAYS = 7; // below this: non-zero exit

const DAILY_FILTER = { kind: { $nin: ["mega", "chapter", "mini"] }, status: "active" };

function dayKey(d = new Date()): string {
  return d.toISOString().split("T")[0];
}
function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000)
    .toISOString()
    .split("T")[0];
}

async function run() {
  await connectDatabase();
  const today = dayKey();

  // ── Daily case runway (contiguous days from today) ──
  const futureDaily = await Case.find({
    ...DAILY_FILTER,
    availableDate: { $gte: today },
  })
    .select("availableDate title")
    .lean();

  const dates = new Set(futureDaily.map((c) => c.availableDate));
  let runway = 0;
  let cursor = today;
  while (dates.has(cursor)) {
    runway++;
    cursor = addDays(cursor, 1);
  }
  const firstGap = dates.size > 0 ? cursor : today; // the first missing day
  const lastDate = futureDaily
    .map((c) => c.availableDate)
    .sort()
    .pop();

  const totalDaily = await Case.countDocuments(DAILY_FILTER);
  const futureMinis = await Case.countDocuments({
    kind: "mini",
    status: "active",
    availableDate: { $gte: today },
  });
  const megaUpcoming = await Case.countDocuments({
    kind: "mega",
    status: { $in: ["active", "upcoming"] },
  });
  const chapters = await Case.countDocuments({ kind: "chapter" });

  logger.info("──────── Detective Club — Content Runway ────────");
  logger.info(`Today (UTC):            ${today}`);
  logger.info(`Daily cases (total):    ${totalDaily}`);
  logger.info(`Daily runway (contig.): ${runway} day(s)  [warn <${WARN_DAYS}, critical <${CRITICAL_DAYS}]`);
  logger.info(`First content gap:      ${runway > 0 ? firstGap : today}`);
  logger.info(`Last scheduled daily:   ${lastDate ?? "(none)"}`);
  logger.info(`Mini cases (today→):    ${futureMinis}`);
  logger.info(`Mega cases (live/soon): ${megaUpcoming}`);
  logger.info(`Story chapters:         ${chapters}`);
  logger.info("─────────────────────────────────────────────────");

  await mongoose.disconnect();

  if (runway < CRITICAL_DAYS) {
    logger.error(
      `CRITICAL: only ${runway} day(s) of daily content. Import more before ${firstGap}.`,
    );
    process.exit(1);
  }
  if (runway < WARN_DAYS) {
    logger.warn(`WARNING: daily runway is ${runway} day(s). Top up soon.`);
  } else {
    logger.info(`OK: ${runway} days of daily runway.`);
  }
  process.exit(0);
}

run().catch((err) => {
  logger.error("content:status failed:", err);
  process.exit(1);
});
