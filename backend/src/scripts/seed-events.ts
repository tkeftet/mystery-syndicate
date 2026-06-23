/**
 * Seed example Weekly Mega Case events. Run:  yarn seed:events
 *
 * Idempotent — skips if any Event already exists. Creates:
 *   1) an ACTIVE event (started ~1h ago, ends in ~71h) so you can test
 *      participate/submit/leaderboard immediately, and
 *   2) an UPCOMING event scheduled for the next Friday 18:00 UTC.
 *
 * Each event owns its own mega Case (Case.kind = "mega") that carries the actual
 * investigation. Add more weekly events by appending to MEGA_SEEDS — or, later,
 * via the web admin panel.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { Event } from "../modules/events/event.model";
import { logger } from "../utils/logger";

const now = new Date();

function ymd(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Next Friday 18:00 UTC, optionally N weeks ahead. */
function nextFriday1800(weeksAhead = 0): Date {
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      18,
      0,
      0,
    ),
  );
  let add = (5 - d.getUTCDay() + 7) % 7; // 5 = Friday
  if (add === 0 && now.getTime() > d.getTime()) add = 7;
  d.setUTCDate(d.getUTCDate() + add + weeksAhead * 7);
  return d;
}

const HOUR = 3600 * 1000;

const REWARD_CONFIG = {
  top1: { title: "event_title_grandmaster", xp: 5000, coins: 2000 },
  top10: { badge: "event_badge_elite", xp: 2000, coins: 1000 },
  top100: { xp: 500, coins: 300 },
  participation: { xp: 100, coins: 50 },
};

// ── Mega case content ────────────────────────────────────────────────────────

const grandHotel = {
  title: "The Grand Hotel Murder",
  description:
    "On the stormy opening night of the Grand Meridian Hotel, its owner Cornelius Vane is found dead in the locked Presidential Suite. Five guests had reason to want him gone.",
  type: "murder" as const,
  difficulty: "expert" as const,
  status: "active" as const,
  estimatedMinutes: 30,
  maxScore: 3000,
  kind: "mega" as const,
  victim: {
    name: "Cornelius Vane",
    description: "Ruthless hotel magnate, 61, celebrating his grand opening.",
    avatar: "default_victim",
  },
  suspects: [
    {
      id: "suspect_1",
      name: "Lydia Vane",
      description: "The victim's much younger wife.",
      alibi: "Says she was at the rooftop bar until midnight.",
      relationship: "Wife — sole heir to the estate.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_2",
      name: "Marcus Reed",
      description: "The hotel's head architect, recently fired.",
      alibi: "Claims he was packing his office.",
      relationship: "Former employee, publicly humiliated by Vane.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_3",
      name: "Sofia Castellano",
      description: "A rival hotelier and former business partner.",
      alibi: "Says she never left the gala ballroom.",
      relationship: "Ex-partner Vane forced out of the company.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_4",
      name: "Henri Dubois",
      description: "The devoted but underpaid concierge.",
      alibi: "Was on shift at the front desk — alone.",
      relationship: "Loyal staff owed years of back pay.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_5",
      name: "Dr. Alistair Crowe",
      description: "Vane's personal physician and old friend.",
      alibi: "Says he retired to his room early with a migraine.",
      relationship: "Friend hiding a malpractice secret Vane knew.",
      avatar: "default_suspect",
    },
  ],
  evidence: [
    {
      id: "ev_1",
      title: "Master Keycard Log",
      description:
        "The suite's electronic lock recorded a staff master card at 11:48 PM.",
      type: "digital" as const,
      isRedHerring: false,
    },
    {
      id: "ev_2",
      title: "Shattered Wine Glass",
      description: "A broken glass with traces of a sedative on the rim.",
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_3",
      title: "Torn Eviction Notice",
      description: "A crumpled letter firing Marcus Reed, found in the hall.",
      type: "document" as const,
      isRedHerring: true,
    },
    {
      id: "ev_4",
      title: "Concierge Ledger",
      description:
        "Henri's front-desk ledger shows a 20-minute gap around midnight.",
      type: "document" as const,
      isRedHerring: false,
    },
    {
      id: "ev_5",
      title: "Brass Letter Opener",
      description:
        "An engraved letter opener missing from the suite's desk set.",
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_6",
      title: "Perfumed Scarf",
      description: "A silk scarf smelling of Sofia's signature perfume.",
      type: "physical" as const,
      isRedHerring: true,
    },
    {
      id: "ev_7",
      title: "Medical Prescription Pad",
      description:
        "Dr. Crowe's pad — the top sheet matches the sedative on the glass.",
      type: "document" as const,
      isRedHerring: false,
    },
  ],
  witnessStatements: [
    {
      id: "w_1",
      witnessName: "Rooftop Bartender",
      statement: "Mrs. Vane left the bar before 11, not at midnight.",
      reliability: "reliable" as const,
    },
    {
      id: "w_2",
      witnessName: "Night Porter",
      statement:
        "I saw the concierge slip into the service elevator near midnight.",
      reliability: "uncertain" as const,
    },
    {
      id: "w_3",
      witnessName: "Gala Photographer",
      statement: "Ms. Castellano was in every ballroom photo until 12:15.",
      reliability: "reliable" as const,
    },
  ],
  timeline: [
    {
      id: "t_1",
      time: "10:45 PM",
      description: "Vane argues with Marcus Reed in the lobby.",
      involvedSuspects: ["suspect_2"],
    },
    {
      id: "t_2",
      time: "11:00 PM",
      description: "Lydia Vane leaves the rooftop bar early.",
      involvedSuspects: ["suspect_1"],
    },
    {
      id: "t_3",
      time: "11:48 PM",
      description: "A staff master card opens the Presidential Suite.",
      involvedSuspects: ["suspect_4"],
    },
    {
      id: "t_4",
      time: "12:00 AM",
      description: "The concierge's ledger shows a 20-minute gap.",
      involvedSuspects: ["suspect_4"],
    },
    {
      id: "t_5",
      time: "12:30 AM",
      description: "Vane's body is discovered by housekeeping.",
      involvedSuspects: [],
    },
  ],
  megaOptions: {
    motives: [
      "Inheritance",
      "Revenge for being fired",
      "Years of unpaid wages",
      "Covering up a medical secret",
      "Business rivalry",
    ],
    weapons: [
      "Brass letter opener",
      "Poisoned wine",
      "Strangulation scarf",
      "Blunt object",
    ],
  },
  solution: {
    suspectId: "suspect_4",
    motive: "Years of unpaid wages",
    weapon: "Brass letter opener",
    timelineEventId: "t_3",
    explanation:
      "Henri the concierge used his master card at 11:48 PM (the keycard log), slipped away during the 20-minute ledger gap, and killed Vane with the brass letter opener over years of withheld pay. The eviction notice and perfumed scarf were red herrings pointing at Marcus and Sofia.",
  },
};

const operaHouse = {
  title: "Murder at the Midnight Opera",
  description:
    "During the final bow of a sold-out premiere, lead soprano Vivienne Marchetti collapses — poisoned. The killer is still inside the opera house.",
  type: "murder" as const,
  difficulty: "hard" as const,
  status: "active" as const,
  estimatedMinutes: 30,
  maxScore: 2500,
  kind: "mega" as const,
  victim: {
    name: "Vivienne Marchetti",
    description: "Celebrated soprano, 38, at the peak of her fame.",
    avatar: "default_victim",
  },
  suspects: [
    {
      id: "suspect_1",
      name: "Elena Rossi",
      description: "The understudy who finally wanted the spotlight.",
      alibi: "Says she was in the wings the whole performance.",
      relationship: "Understudy, passed over for years.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_2",
      name: "Maestro Bellini",
      description: "The conductor and Vivienne's jilted lover.",
      alibi: "Was conducting — in full view of the orchestra.",
      relationship: "Former lover, recently scorned.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_3",
      name: "Gerald Foss",
      description: "The producer drowning in debt.",
      alibi: "Claims he watched from the producer's box.",
      relationship: "Producer who insured Vivienne for a fortune.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_4",
      name: "Anya Volkov",
      description: "The meticulous costume mistress.",
      alibi: "Says she was steaming costumes backstage.",
      relationship: "Staff blamed publicly for a wardrobe disaster.",
      avatar: "default_suspect",
    },
    {
      id: "suspect_5",
      name: "Tomas Reyes",
      description: "A obsessive superfan with backstage access.",
      alibi: "Insists he was in his usual front-row seat.",
      relationship: "Superfan recently banned by Vivienne.",
      avatar: "default_suspect",
    },
  ],
  evidence: [
    {
      id: "ev_1",
      title: "Poisoned Throat Spray",
      description: "Vivienne's vocal spray laced with a fast-acting toxin.",
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_2",
      title: "Dressing Room Sign-In",
      description: "Only the costume mistress signed in during intermission.",
      type: "document" as const,
      isRedHerring: false,
    },
    {
      id: "ev_3",
      title: "Threatening Fan Letter",
      description: "An unhinged letter from a banned superfan.",
      type: "document" as const,
      isRedHerring: true,
    },
    {
      id: "ev_4",
      title: "Insurance Policy",
      description: "A huge payout policy the producer took on Vivienne.",
      type: "document" as const,
      isRedHerring: true,
    },
    {
      id: "ev_5",
      title: "Costume Pin with Residue",
      description: "A wardrobe pin bearing the same toxin as the spray.",
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_6",
      title: "Intermission CCTV",
      description:
        "Footage shows Anya alone entering the star dressing room at the break.",
      type: "digital" as const,
      isRedHerring: false,
    },
  ],
  witnessStatements: [
    {
      id: "w_1",
      witnessName: "Stagehand",
      statement: "The understudy never left the wings — I'd have seen her.",
      reliability: "reliable" as const,
    },
    {
      id: "w_2",
      witnessName: "First Violinist",
      statement: "The Maestro never lowered his baton during the act.",
      reliability: "reliable" as const,
    },
    {
      id: "w_3",
      witnessName: "Usher",
      statement: "I thought I saw the superfan leave his seat — maybe.",
      reliability: "uncertain" as const,
    },
  ],
  timeline: [
    {
      id: "t_1",
      time: "8:30 PM",
      description: "Vivienne publicly snaps at the costume mistress.",
      involvedSuspects: ["suspect_4"],
    },
    {
      id: "t_2",
      time: "9:15 PM",
      description: "Intermission begins; dressing rooms clear out.",
      involvedSuspects: [],
    },
    {
      id: "t_3",
      time: "9:20 PM",
      description: "CCTV shows Anya entering the star dressing room alone.",
      involvedSuspects: ["suspect_4"],
    },
    {
      id: "t_4",
      time: "9:45 PM",
      description: "Act II resumes; Vivienne uses her throat spray.",
      involvedSuspects: [],
    },
    {
      id: "t_5",
      time: "10:30 PM",
      description: "Vivienne collapses during the final bow.",
      involvedSuspects: [],
    },
  ],
  megaOptions: {
    motives: [
      "Jealousy over the lead role",
      "A scorned love affair",
      "An insurance payout",
      "Public humiliation and revenge",
      "Obsessive infatuation",
    ],
    weapons: [
      "Poisoned throat spray",
      "Toxic costume pin",
      "Tainted champagne",
      "Sabotaged stage rigging",
    ],
  },
  solution: {
    suspectId: "suspect_4",
    motive: "Public humiliation and revenge",
    weapon: "Poisoned throat spray",
    timelineEventId: "t_3",
    explanation:
      "The costume mistress Anya, humiliated once too often, entered the dressing room alone during intermission (CCTV + sign-in) and laced the throat spray with the same toxin found on her wardrobe pin. The fan letter and insurance policy were deliberate misdirection.",
  },
};

// ── Event schedule ───────────────────────────────────────────────────────────

const MEGA_SEEDS = [
  {
    case_: grandHotel,
    event: {
      title: grandHotel.title,
      description: grandHotel.description,
      image: "",
      startDate: new Date(now.getTime() - 1 * HOUR), // active now
      endDate: new Date(now.getTime() + 71 * HOUR),
      status: "active" as const,
      difficulty: "expert" as const,
      targetCompletionSec: 1800,
    },
  },
  {
    case_: operaHouse,
    event: {
      title: operaHouse.title,
      description: operaHouse.description,
      image: "",
      startDate: nextFriday1800(0),
      endDate: new Date(nextFriday1800(0).getTime() + 72 * HOUR),
      status: "upcoming" as const,
      difficulty: "hard" as const,
      targetCompletionSec: 1800,
    },
  },
];

async function run() {
  await connectDatabase();

  const existing = await Event.countDocuments();
  if (existing > 0) {
    logger.info(`Events already seeded (${existing}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  for (const seed of MEGA_SEEDS) {
    const caseDoc = await Case.create({
      ...seed.case_,
      availableDate: ymd(seed.event.startDate),
      status: "active",
    });
    caseDoc.eventId = caseDoc.id;
    const created = await Event.create({
      ...seed.event,
      caseId: caseDoc.id,
      rewardConfig: REWARD_CONFIG,
      leaderboardEnabled: true,
      createdBy: "seed",
    });
    // Backfill the case's eventId now that the event id exists.
    await Case.findByIdAndUpdate(caseDoc.id, { eventId: created.id });
    logger.info(`Seeded event "${created.title}" (${created.status}).`);
  }

  logger.info(`Seeded ${MEGA_SEEDS.length} mega-case events.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Event seed failed:", err);
  process.exit(1);
});
