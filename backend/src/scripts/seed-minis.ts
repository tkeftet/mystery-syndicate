/**
 * Seed today's quick Mini Cases (1-2 min each). Run:  yarn seed:minis
 *
 * Idempotent for the day — skips if a mini already exists for today. Mini cases
 * are normal Cases with kind "mini" + a low maxScore, played through the regular
 * investigation flow.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { logger } from "../utils/logger";

const today = new Date().toISOString().split("T")[0];

type MiniDef = {
  title: string;
  description: string;
  crime: "murder" | "theft" | "disappearance" | "sabotage" | "fraud";
  victim: { name: string; description: string };
  suspects: Array<{ id: string; name: string; description: string; alibi: string; relationship: string }>;
  evidence: Array<{ id: string; title: string; description: string; type: "physical" | "digital" | "testimonial" | "document"; isRedHerring?: boolean }>;
  witnesses: Array<{ id: string; witnessName: string; statement: string; reliability: "reliable" | "unreliable" | "uncertain" }>;
  timeline: Array<{ id: string; time: string; description: string; involvedSuspects: string[] }>;
  solution: { suspectId: string; motive: string; timelineEventId: string; explanation: string };
};

const MINIS: MiniDef[] = [
  {
    title: "The Spilled Latte",
    description: "A café laptop with a finished novel manuscript is wiped clean. Three regulars were nearby.",
    crime: "sabotage",
    victim: { name: "Owen's Manuscript", description: "A year of writing, deleted in minutes." },
    suspects: [
      { id: "suspect_1", name: "Mara", description: "A jealous rival writer.", alibi: "Says she was reading.", relationship: "Competing for the same publisher." },
      { id: "suspect_2", name: "Theo", description: "The barista.", alibi: "Was making drinks.", relationship: "Owed Owen money." },
      { id: "suspect_3", name: "Gwen", description: "A quiet student.", alibi: "Says she had headphones on.", relationship: "Stranger." },
    ],
    evidence: [
      { id: "ev_1", title: "Coffee Ring", description: "A latte was spilled on the keyboard at 3:02 PM.", type: "physical" },
      { id: "ev_2", title: "Wi-Fi Log", description: "A remote wipe command came from the café network at 3:03 PM.", type: "digital" },
      { id: "ev_3", title: "Loyalty Card", description: "A rival's card used moments earlier.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Cashier", statement: "The rival writer leaned over his laptop right before he yelled.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "3:00 PM", description: "Owen leaves for the restroom.", involvedSuspects: [] },
      { id: "t_2", time: "3:02 PM", description: "A latte spills on the keyboard.", involvedSuspects: ["suspect_1"] },
    ],
    solution: { suspectId: "suspect_1", motive: "Eliminating a rival's book", timelineEventId: "t_2", explanation: "Mara spilled the latte and triggered the wipe to sink her competitor's novel." },
  },
  {
    title: "The Locker Room Theft",
    description: "A championship ring vanishes from a gym locker during a 10-minute class.",
    crime: "theft",
    victim: { name: "Coach Bryce", description: "His prized championship ring is gone." },
    suspects: [
      { id: "suspect_1", name: "Reggie", description: "A new member.", alibi: "Says he was on the treadmill.", relationship: "Joined last week." },
      { id: "suspect_2", name: "Dana", description: "The cleaning attendant.", alibi: "Was mopping the showers.", relationship: "Has a locker master key." },
      { id: "suspect_3", name: "Sal", description: "A long-time regular.", alibi: "Was in the sauna.", relationship: "Friendly with the coach." },
    ],
    evidence: [
      { id: "ev_1", title: "Master Key Swipe", description: "The master key opened the coach's locker mid-class.", type: "digital" },
      { id: "ev_2", title: "Wet Footprints", description: "Damp prints lead from the showers to the lockers.", type: "physical" },
      { id: "ev_3", title: "Treadmill Log", description: "A new member ran the whole class — no break.", type: "digital", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Member", statement: "The attendant slipped into the locker aisle with a mop bucket.", reliability: "uncertain" },
    ],
    timeline: [
      { id: "t_1", time: "6:10 PM", description: "Class begins; the locker room empties.", involvedSuspects: [] },
      { id: "t_2", time: "6:14 PM", description: "The master key opens the coach's locker.", involvedSuspects: ["suspect_2"] },
    ],
    solution: { suspectId: "suspect_2", motive: "Quick cash from a rare ring", timelineEventId: "t_2", explanation: "Dana used the master key and left wet prints from the showers — the treadmill member never stopped running." },
  },
  {
    title: "The Poisoned Office Plant",
    description: "An employee's award-winning bonsai dies overnight. Sabotage before the company contest.",
    crime: "sabotage",
    victim: { name: "Priya's Bonsai", description: "A contest favorite, suddenly withered." },
    suspects: [
      { id: "suspect_1", name: "Karl", description: "A sore-loser coworker.", alibi: "Says he left at 5.", relationship: "Lost to Priya last year." },
      { id: "suspect_2", name: "Nina", description: "The office cleaner.", alibi: "Was vacuuming.", relationship: "No stake in the contest." },
      { id: "suspect_3", name: "Ed", description: "The facilities guy.", alibi: "Was fixing the AC.", relationship: "Waters all the plants." },
    ],
    evidence: [
      { id: "ev_1", title: "Badge Log", description: "A coworker badged back in at 7:40 PM.", type: "digital" },
      { id: "ev_2", title: "Bleach Residue", description: "The soil tested positive for bleach.", type: "physical" },
      { id: "ev_3", title: "Watering Schedule", description: "Facilities watered plants at 4 PM as usual.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Security Guard", statement: "Karl came back after hours and went straight to the plant shelf.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "5:00 PM", description: "The office clears out.", involvedSuspects: [] },
      { id: "t_2", time: "7:40 PM", description: "A coworker badges back in.", involvedSuspects: ["suspect_1"] },
    ],
    solution: { suspectId: "suspect_1", motive: "Revenge for losing last year", timelineEventId: "t_2", explanation: "Karl returned after hours and poured bleach in the soil to knock out the reigning champion." },
  },
];

async function run() {
  await connectDatabase();

  const existing = await Case.countDocuments({ kind: "mini", availableDate: today });
  if (existing > 0) {
    logger.info(`Mini cases already seeded for ${today} (${existing}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  for (const m of MINIS) {
    await Case.create({
      kind: "mini",
      title: m.title,
      description: m.description,
      type: m.crime,
      difficulty: "easy",
      status: "active",
      availableDate: today,
      estimatedMinutes: 2,
      maxScore: 300,
      victim: { ...m.victim, avatar: "default_victim" },
      suspects: m.suspects.map((s) => ({ ...s, avatar: "default_suspect" })),
      evidence: m.evidence.map((e) => ({ isRedHerring: false, ...e })),
      witnessStatements: m.witnesses,
      timeline: m.timeline,
      solution: { ...m.solution, weapon: "" },
    });
  }

  logger.info(`Seeded ${MINIS.length} mini cases for ${today}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Mini seed failed:", err);
  process.exit(1);
});
