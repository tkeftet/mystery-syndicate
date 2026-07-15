/**
 * Translate authored English cases into localized ({ en, fr, ar }) form using the
 * Claude API, ready for `yarn content:import`.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... yarn content:translate <in.json> [out.json]
 *
 * Input is the same array-of-cases shape the seeds/import use, authored in English
 * (plain strings). For each case, every *display* text field is rewritten to a
 * { en, fr, ar } object; ids, enums, avatars, dates, numbers, and the answer-bearing
 * option strings (`megaOptions.motives/weapons`, `solution.motive/weapon`) are left
 * exactly as-is so mega/chapter scoring keeps working (see shared/localized.ts).
 *
 * Output defaults to "<in>.localized.json". Re-runnable and idempotent per case.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";

// Localizable display fields, by path within a case. Everything not listed here
// (ids, type, difficulty, avatars, availableDate, numbers, megaOptions,
// solution.suspectId/motive/weapon/timelineEventId) is passed through untouched.
const CASE_TEXT_FIELDS = [
  "title",
  "description",
  "storyText",
  "cliffhanger",
  "victim.name",
  "victim.description",
  "suspects[].name",
  "suspects[].description",
  "suspects[].alibi",
  "suspects[].relationship",
  "evidence[].title",
  "evidence[].description",
  "witnessStatements[].witnessName",
  "witnessStatements[].statement",
  "timeline[].time",
  "timeline[].description",
  "solution.explanation",
];

const MODEL = "claude-opus-4-8";

function buildPrompt(caseObj: any): string {
  return [
    "You are localizing detective-game case content for a mobile app.",
    "Translate the case below into French (fr) and Arabic (ar), keeping the English (en) original.",
    "",
    "Rules:",
    "- Return ONLY a single JSON object (no markdown fences, no commentary).",
    "- Keep the EXACT same structure, keys, ids, and array order as the input.",
    "- For each of these display text fields, replace the string value with an object",
    `  { "en": <original>, "fr": <french>, "ar": <arabic> }: ${CASE_TEXT_FIELDS.join(", ")}.`,
    "- Do NOT translate or modify any other field. In particular keep these EXACTLY as-is",
    "  (plain strings/values, not localized): id, type, difficulty, kind, status,",
    "  availableDate, estimatedMinutes, maxScore, all *.id fields, all avatar fields,",
    "  megaOptions.motives, megaOptions.weapons, solution.suspectId, solution.motive,",
    "  solution.weapon, solution.timelineEventId, timeline[].involvedSuspects.",
    "- Translate faithfully and keep the mystery solvable: clues, alibis, and the",
    "  explanation must stay logically consistent with the English. Use natural,",
    "  fluent French and Modern Standard Arabic. Preserve names of people/places",
    "  (transliterate into Arabic script; keep Latin spelling in French).",
    "",
    "Input case JSON:",
    JSON.stringify(caseObj),
  ].join("\n");
}

function extractJson(text: string): any {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function translateCase(client: Anthropic, caseObj: any): Promise<any> {
  // Stream so a large case doesn't hit the request timeout; get the final message.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{ role: "user", content: buildPrompt(caseObj) }],
  });
  const message = await stream.finalMessage();
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return extractJson(text);
}

async function run() {
  const inArg = process.argv[2];
  if (!inArg) {
    logger.error("Usage: yarn content:translate <in.json> [out.json]");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error(
      "ANTHROPIC_API_KEY is not set. Get a key at https://console.anthropic.com and run:",
    );
    logger.error("  ANTHROPIC_API_KEY=sk-ant-... yarn content:translate <in.json>");
    process.exit(1);
  }

  const inFile = path.resolve(process.cwd(), inArg);
  const outFile = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : inFile.replace(/\.json$/i, "") + ".localized.json";

  const cases: any[] = JSON.parse(fs.readFileSync(inFile, "utf8"));
  if (!Array.isArray(cases)) {
    logger.error("Top-level JSON must be an array of case objects.");
    process.exit(1);
  }

  const client = new Anthropic();
  const out: any[] = [];
  for (let i = 0; i < cases.length; i++) {
    const title =
      typeof cases[i]?.title === "string" ? cases[i].title : `case[${i}]`;
    logger.info(`Translating ${i + 1}/${cases.length}: ${title}`);
    try {
      out.push(await translateCase(client, cases[i]));
    } catch (e: any) {
      logger.error(`  ✗ failed (${e?.message}); keeping English original`);
      out.push(cases[i]); // fall back to the untranslated case rather than abort
    }
    // Persist progress after every case so a mid-run failure isn't lost.
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  }

  logger.info(`Done. Wrote ${out.length} case(s) to ${outFile}`);
  logger.info(`Next: yarn content:import ${path.relative(process.cwd(), outFile)}`);
}

run().catch((err) => {
  logger.error("content:translate failed:", err);
  process.exit(1);
});
