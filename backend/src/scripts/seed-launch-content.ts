/**
 * Launch content generator.  Run:  yarn content:launch
 *
 * Populates a full 2-month content calendar STARTING TODAY (the first daily case
 * is today's date), so the app has:
 *   • 62 daily cases   (one per day, first = today)
 *   • 3 mini cases per day  (186 quick cases)
 *   • 9 weekly Mega Case events (continuous weekly coverage)
 *   • 2 back-to-back Story-Arc Seasons (6 chapters each, one ~month apiece)
 *
 * IDEMPOTENT / DESTRUCTIVE RESET: this wipes the existing content calendar
 * (daily/mini/mega/chapter Cases, all Events + Seasons) and rebuilds it from
 * today. Intended for pre-launch when there is no real player progress to keep.
 * EventParticipation / SeasonProgress that referenced removed events/seasons are
 * also cleared to avoid dangling references.
 *
 * Content is TEMPLATE-GENERATED: a curated pool of plot skeletons is expanded
 * across the calendar with rotating names/dates/difficulty. Logic stays sound —
 * each generated case wires its solution to a real suspect + timeline event and
 * its red herrings to innocents.
 */
import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { Event } from "../modules/events/event.model";
import { Season } from "../modules/seasons/season.model";
import { logger } from "../utils/logger";

// ── Calendar anchors ─────────────────────────────────────────────────────────
const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const TODAY = new Date(
  Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  ),
);
const TOTAL_DAYS = 62;

type Crime = "murder" | "theft" | "disappearance" | "sabotage" | "fraud";
type Difficulty = "easy" | "medium" | "hard" | "expert";

const ymd = (d: Date) => d.toISOString().split("T")[0];
const dayDate = (offset: number) => new Date(TODAY.getTime() + offset * DAY_MS);

const DIFF: Record<Difficulty, { estimatedMinutes: number; maxScore: number }> = {
  easy: { estimatedMinutes: 5, maxScore: 800 },
  medium: { estimatedMinutes: 7, maxScore: 1200 },
  hard: { estimatedMinutes: 9, maxScore: 1600 },
  expert: { estimatedMinutes: 12, maxScore: 2200 },
};

// ── Name rotation (keeps generated cases from reading identically) ───────────
const NAMES = [
  "Alden", "Bianca", "Cyrus", "Delia", "Elias", "Farah", "Gideon", "Hana",
  "Ivo", "Juno", "Kaleb", "Lena", "Milo", "Nadia", "Osric", "Petra",
  "Quinn", "Rhea", "Soren", "Talia", "Ugo", "Vera", "Wes", "Xenia",
  "Yannis", "Zara", "Anselm", "Briar", "Corin", "Dax", "Esme", "Fox",
  "Greer", "Hollis", "Iris", "Joss", "Karim", "Liv", "Marek", "Noor",
  "Orin", "Pia", "Reeve", "Suri", "Tomas", "Ula", "Viggo", "Wren",
];
const nameAt = (seed: number) => NAMES[((seed % NAMES.length) + NAMES.length) % NAMES.length];

const crimeNoun: Record<Crime, string> = {
  murder: "Murder",
  theft: "Theft",
  disappearance: "Disappearance",
  sabotage: "Sabotage",
  fraud: "Fraud",
};
const crimeVerb: Record<Crime, string> = {
  murder: "killed",
  theft: "robbed",
  disappearance: "made {v} vanish",
  sabotage: "sabotaged",
  fraud: "defrauded",
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY / standalone case factory
// ─────────────────────────────────────────────────────────────────────────────
interface Role {
  role: string; // short descriptor
  alibi: string;
  rel: string; // relationship to the victim/scene
}
interface DailyPack {
  place: string;
  crime: Crime;
  victimRole: string; // e.g. "the gallery owner"
  suspects: [Role, Role, Role, Role];
  culprit: 0 | 1 | 2 | 3;
  herring: 0 | 1 | 2 | 3; // an innocent the red herring points to
  motive: string;
  means: string; // weapon / method
  keyTime: string;
  clue: string; // the damning trace ("keycard swipe", "muddy print"…)
  witnessLine: string; // reliable statement implicating the culprit ({c}=culprit name)
}

function buildDaily(
  pack: DailyPack,
  availableDate: string,
  difficulty: Difficulty,
  instance: number,
) {
  const base = instance * 6;
  const victimName = nameAt(base);
  const sNames = [1, 2, 3, 4].map((k) => nameAt(base + k));
  const witnessName = nameAt(base + 5);

  const suspects = pack.suspects.map((r, i) => ({
    id: `suspect_${i + 1}`,
    name: sNames[i],
    description: `${sNames[i]} — ${r.role}.`,
    alibi: r.alibi,
    relationship: r.rel,
    avatar: "default_suspect",
  }));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const culpritName = sNames[pack.culprit];
  const herringName = sNames[pack.herring];

  const evidence = [
    {
      id: "ev_1",
      title: `The ${pack.clue}`,
      description: `A ${pack.clue} places someone at ${pack.place} at ${pack.keyTime} — right around the crime.`,
      type: "digital" as const,
      isRedHerring: false,
    },
    {
      id: "ev_2",
      title: `Trace of the ${pack.means}`,
      description: `Forensics tie the ${pack.means} to whoever acted at ${pack.keyTime}.`,
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_3",
      title: "A Convenient Grudge",
      description: `${herringName} openly clashed with the victim — an obvious, and misleading, suspect.`,
      type: "testimonial" as const,
      isRedHerring: true,
    },
  ];
  if (difficulty === "hard" || difficulty === "expert") {
    evidence.push({
      id: "ev_4",
      title: "Planted Distraction",
      description: `An item belonging to ${herringName} was left at the scene — too neatly to be real.`,
      type: "physical" as const,
      isRedHerring: true,
    });
  }

  const timeline = [
    {
      id: "t_1",
      time: "Earlier",
      description: `The scene at ${pack.place} empties out; the victim is left exposed.`,
      involvedSuspects: [],
    },
    {
      id: "t_2",
      time: pack.keyTime,
      description: `${culpritName} is placed at ${pack.place} — matching the ${pack.clue}.`,
      involvedSuspects: [culpritId],
    },
    {
      id: "t_3",
      time: "Discovery",
      description: `The crime is discovered; the ${pack.means} is missing or used.`,
      involvedSuspects: [],
    },
  ];

  const witnessStatements = [
    {
      id: "w_1",
      witnessName,
      statement: pack.witnessLine.replace(/\{c\}/g, culpritName),
      reliability: "reliable" as const,
    },
    {
      id: "w_2",
      witnessName: nameAt(base + 4),
      statement: `${herringName} was loud and angry, but never actually near ${pack.place} at ${pack.keyTime}.`,
      reliability: "uncertain" as const,
    },
  ];

  const vVerb = crimeVerb[pack.crime].replace("{v}", victimName);
  return {
    kind: "daily" as const,
    title: `The ${crimeNoun[pack.crime]} of ${victimName}`,
    description: `${pack.victimRole[0].toUpperCase()}${pack.victimRole.slice(1)}, ${victimName}, was ${vVerb} at ${pack.place}. Four people had reason and opportunity.`,
    type: pack.crime,
    difficulty,
    status: "active" as const,
    availableDate,
    estimatedMinutes: DIFF[difficulty].estimatedMinutes,
    maxScore: DIFF[difficulty].maxScore,
    victim: {
      name: victimName,
      description: `${pack.victimRole}.`,
      avatar: "default_victim",
    },
    suspects,
    evidence,
    witnessStatements,
    timeline,
    solution: {
      suspectId: culpritId,
      motive: pack.motive,
      weapon: pack.means,
      timelineEventId: "t_2",
      explanation: `${culpritName} was placed at ${pack.place} at ${pack.keyTime} by the ${pack.clue} and tied to the ${pack.means}. Motive: ${pack.motive}. The grudge and planted item pointing at ${herringName} were deliberate misdirection.`,
    },
  };
}

const DAILY_PACKS: DailyPack[] = [
  {
    place: "the Meridian art gallery", crime: "theft", victimRole: "the gallery owner",
    suspects: [
      { role: "the night curator", alibi: "says they were cataloguing upstairs", rel: "handles the vault code" },
      { role: "a rival collector", alibi: "claims to have left at closing", rel: "was outbid last month" },
      { role: "the security guard", alibi: "was on patrol", rel: "recently passed over for a raise" },
      { role: "an insurance assessor", alibi: "says they were off-site", rel: "valued the stolen piece" },
    ],
    culprit: 0, herring: 1, motive: "quiet cash from a private buyer", means: "duplicate vault key",
    keyTime: "11:40 PM", clue: "vault keypad log", witnessLine: "{c} lingered by the vault long after closing.",
  },
  {
    place: "the Harborview marina", crime: "murder", victimRole: "the yacht broker",
    suspects: [
      { role: "a jilted business partner", alibi: "claims to have sailed out early", rel: "was frozen out of the company" },
      { role: "the dockmaster", alibi: "was logging arrivals", rel: "owed the victim a fortune" },
      { role: "the victim's ex", alibi: "says they were at a restaurant", rel: "lost everything in the split" },
      { role: "a deckhand", alibi: "was scrubbing the hull", rel: "was about to be fired" },
    ],
    culprit: 1, herring: 2, motive: "erasing an unpayable debt", means: "mooring line",
    keyTime: "9:15 PM", clue: "dock CCTV timestamp", witnessLine: "{c} slipped onto the victim's slip after the lights went out.",
  },
  {
    place: "the Ashford tech campus", crime: "sabotage", victimRole: "the lead engineer's demo build",
    suspects: [
      { role: "a passed-over coder", alibi: "says they were at lunch", rel: "wanted the promotion" },
      { role: "the QA lead", alibi: "was running tests", rel: "warned about the deadline" },
      { role: "a departing intern", alibi: "claims they'd already left", rel: "held a grudge over credit" },
      { role: "the ops admin", alibi: "was patching servers", rel: "controls deploy keys" },
    ],
    culprit: 3, herring: 0, motive: "burning a project that sidelined them", means: "rogue deploy script",
    keyTime: "2:05 AM", clue: "deploy server login", witnessLine: "{c} pushed a change no one approved overnight.",
  },
  {
    place: "the Rowan estate library", crime: "murder", victimRole: "the reclusive heir",
    suspects: [
      { role: "the family lawyer", alibi: "says they were reviewing the will", rel: "drafted a suspicious codicil" },
      { role: "a disowned cousin", alibi: "claims to have been in town", rel: "was cut from the inheritance" },
      { role: "the live-in nurse", alibi: "was preparing medication", rel: "controlled the victim's pills" },
      { role: "the groundskeeper", alibi: "was trimming the hedges", rel: "was owed back wages" },
    ],
    culprit: 2, herring: 1, motive: "a forged inheritance that only worked if the heir died first", means: "overdose",
    keyTime: "10:50 PM", clue: "medication cabinet log", witnessLine: "{c} handled the pills alone that night.",
  },
  {
    place: "the Belrose bank branch", crime: "fraud", victimRole: "the branch manager",
    suspects: [
      { role: "a senior teller", alibi: "says they balanced the drawer", rel: "had access to dormant accounts" },
      { role: "the loan officer", alibi: "was with a client", rel: "approved shady transfers" },
      { role: "an IT contractor", alibi: "claims remote work", rel: "installed the new system" },
      { role: "the compliance auditor", alibi: "was off that week", rel: "signs off on flags" },
    ],
    culprit: 1, herring: 3, motive: "skimming transfers into a shell account", means: "falsified transfer slips",
    keyTime: "4:30 PM", clue: "transfer approval log", witnessLine: "{c} approved transfers no client requested.",
  },
  {
    place: "the Calder theatre", crime: "disappearance", victimRole: "the lead actress",
    suspects: [
      { role: "the understudy", alibi: "says they were in the wings", rel: "wanted the role" },
      { role: "the stage manager", alibi: "was calling cues", rel: "clashed over schedule" },
      { role: "a persistent fan", alibi: "claims a front-row seat", rel: "was banned backstage" },
      { role: "the director", alibi: "was in the booth", rel: "threatened to recast" },
    ],
    culprit: 0, herring: 2, motive: "removing the only obstacle to the spotlight", means: "locked prop room",
    keyTime: "Intermission", clue: "backstage door badge", witnessLine: "{c} was the last to enter the star's dressing room.",
  },
  {
    place: "the Fenwick pharmaceutical lab", crime: "theft", victimRole: "the research director",
    suspects: [
      { role: "a rival scientist", alibi: "says they were at a conference", rel: "competes for the same grant" },
      { role: "the lab technician", alibi: "was logging samples", rel: "has full freezer access" },
      { role: "a venture investor", alibi: "claims a dinner meeting", rel: "wanted the formula" },
      { role: "the janitor", alibi: "was cleaning floor two", rel: "was recently demoted" },
    ],
    culprit: 1, herring: 0, motive: "selling a formula to the highest bidder", means: "sample freezer key",
    keyTime: "1:20 AM", clue: "freezer access badge", witnessLine: "{c} opened the sample freezer after hours.",
  },
  {
    place: "the Underhill ski lodge", crime: "murder", victimRole: "the resort tycoon",
    suspects: [
      { role: "the estranged son", alibi: "says they were skiing", rel: "was written out of the will" },
      { role: "a bankrupt partner", alibi: "was at the bar", rel: "blamed the victim for ruin" },
      { role: "the lodge manager", alibi: "was at the front desk", rel: "was about to be exposed for theft" },
      { role: "a ski instructor", alibi: "was teaching a class", rel: "had a public feud" },
    ],
    culprit: 2, herring: 3, motive: "silencing someone who'd caught them stealing", means: "loosened balcony rail",
    keyTime: "8:40 PM", clue: "keycard entry log", witnessLine: "{c} was seen tampering with the balcony earlier.",
  },
  {
    place: "the Novak auto plant", crime: "sabotage", victimRole: "the line supervisor's flagship car",
    suspects: [
      { role: "a union organizer", alibi: "says they were in a meeting", rel: "clashed over layoffs" },
      { role: "the parts supplier", alibi: "was off-site", rel: "was caught cutting corners" },
      { role: "a night-shift welder", alibi: "was on break", rel: "was passed over for lead" },
      { role: "the quality inspector", alibi: "was signing off units", rel: "controls the pass stamp" },
    ],
    culprit: 3, herring: 1, motive: "hiding their own defective inspections", means: "swapped brake component",
    keyTime: "3:15 AM", clue: "inspection scanner log", witnessLine: "{c} stamped a unit they never actually checked.",
  },
  {
    place: "the Delacroix vineyard", crime: "fraud", victimRole: "the vintner",
    suspects: [
      { role: "the distributor", alibi: "says they were tasting", rel: "profits from mislabeled crates" },
      { role: "a sommelier", alibi: "was hosting a tour", rel: "authenticates the vintages" },
      { role: "the bookkeeper", alibi: "was reconciling invoices", rel: "cooks the ledgers" },
      { role: "a seasonal picker", alibi: "was in the fields", rel: "holds a grudge over pay" },
    ],
    culprit: 2, herring: 0, motive: "hiding years of skimmed revenue", means: "doctored ledgers",
    keyTime: "5:00 PM", clue: "accounting login trail", witnessLine: "{c} edited invoices after the books closed.",
  },
  {
    place: "the Sterling jewelry vault", crime: "theft", victimRole: "the vault manager",
    suspects: [
      { role: "a diamond broker", alibi: "says they were traveling", rel: "wanted the collection" },
      { role: "the security consultant", alibi: "was testing alarms", rel: "designed the very system" },
      { role: "a longtime clerk", alibi: "was closing registers", rel: "resents being underpaid" },
      { role: "the appraiser", alibi: "was off that day", rel: "knows every stone's worth" },
    ],
    culprit: 1, herring: 2, motive: "the perfect crime against a system they built", means: "alarm bypass code",
    keyTime: "12:10 AM", clue: "alarm control log", witnessLine: "{c} disabled the very alarm they installed.",
  },
  {
    place: "the Aldous newsroom", crime: "disappearance", victimRole: "the investigative reporter",
    suspects: [
      { role: "a corrupt official", alibi: "claims a public event", rel: "was the story's target" },
      { role: "the editor", alibi: "was closing the issue", rel: "spiked the exposé" },
      { role: "a rival journalist", alibi: "says they were chasing a lead", rel: "wanted the byline" },
      { role: "a nervous source", alibi: "was at home", rel: "feared being named" },
    ],
    culprit: 0, herring: 3, motive: "burying a story that would end their career", means: "a black sedan",
    keyTime: "11:00 PM", clue: "parking garage camera", witnessLine: "{c}'s car followed the reporter out of the garage.",
  },
  {
    place: "the Whitlock university lab", crime: "murder", victimRole: "the tenured professor",
    suspects: [
      { role: "a passed-over postdoc", alibi: "says they were grading", rel: "was denied co-authorship" },
      { role: "the department head", alibi: "was in a faculty meeting", rel: "feuded over funding" },
      { role: "a failing grad student", alibi: "was in the library", rel: "faced expulsion" },
      { role: "the lab manager", alibi: "was ordering supplies", rel: "handles the chemicals" },
    ],
    culprit: 0, herring: 1, motive: "stealing credit for a career-making discovery", means: "tampered reagent",
    keyTime: "7:25 PM", clue: "lab door badge", witnessLine: "{c} was alone in the lab before the professor collapsed.",
  },
  {
    place: "the Cormac shipping depot", crime: "theft", victimRole: "the logistics chief",
    suspects: [
      { role: "a warehouse foreman", alibi: "says they were on the dock", rel: "controls the manifest" },
      { role: "a truck driver", alibi: "was on a route", rel: "was caught skimming before" },
      { role: "the customs agent", alibi: "was at the office", rel: "clears the containers" },
      { role: "an inventory clerk", alibi: "was counting stock", rel: "flags discrepancies" },
    ],
    culprit: 0, herring: 3, motive: "diverting containers to a fence", means: "altered manifest",
    keyTime: "6:45 AM", clue: "manifest edit log", witnessLine: "{c} rewrote the manifest before the audit.",
  },
  {
    place: "the Everly charity gala", crime: "fraud", victimRole: "the foundation director",
    suspects: [
      { role: "the event planner", alibi: "was managing the floor", rel: "inflated the invoices" },
      { role: "a board member", alibi: "was giving a speech", rel: "controls the accounts" },
      { role: "the treasurer", alibi: "was counting donations", rel: "handles every transfer" },
      { role: "a celebrity guest", alibi: "was at their table", rel: "pledged a big gift" },
    ],
    culprit: 2, herring: 1, motive: "funneling donations into a personal fund", means: "rerouted donation account",
    keyTime: "9:50 PM", clue: "payment gateway log", witnessLine: "{c} changed the donation account mid-event.",
  },
  {
    place: "the Pinehaven summer camp", crime: "disappearance", victimRole: "the camp director",
    suspects: [
      { role: "a disgruntled counselor", alibi: "says they were at the lake", rel: "was about to be fired" },
      { role: "the caretaker", alibi: "was fixing cabins", rel: "knows every trail" },
      { role: "a parent volunteer", alibi: "claims they'd gone home", rel: "threatened to sue" },
      { role: "the cook", alibi: "was in the mess hall", rel: "had a hidden past" },
    ],
    culprit: 1, herring: 0, motive: "hiding a secret the director had uncovered", means: "an old service road",
    keyTime: "5:30 AM", clue: "gate sensor log", witnessLine: "{c} drove the service road before sunrise.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MINI case factory (quick 2-min, 3 suspects)
// ─────────────────────────────────────────────────────────────────────────────
interface MiniPack {
  title: string;
  place: string;
  crime: Crime;
  target: string; // what was hit
  roles: [string, string, string];
  culprit: 0 | 1 | 2;
  herring: 0 | 1 | 2;
  motive: string;
  clue: string;
  keyTime: string;
}

function buildMini(pack: MiniPack, availableDate: string, instance: number) {
  const base = instance * 4;
  const sNames = [1, 2, 3].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const culpritName = sNames[pack.culprit];
  const herringName = sNames[pack.herring];
  return {
    kind: "mini" as const,
    title: pack.title,
    description: `${pack.target} at ${pack.place}. Three people were close by — spot the culprit fast.`,
    type: pack.crime,
    difficulty: "easy" as const,
    status: "active" as const,
    availableDate,
    estimatedMinutes: 2,
    maxScore: 300,
    victim: { name: pack.target, description: `Targeted at ${pack.place}.`, avatar: "default_victim" },
    suspects: sNames.map((n, i) => ({
      id: `suspect_${i + 1}`,
      name: n,
      description: `${n} — ${pack.roles[i]}.`,
      alibi: i === pack.culprit ? "gives a shaky account" : "has a plausible story",
      relationship: pack.roles[i],
      avatar: "default_suspect",
    })),
    evidence: [
      { id: "ev_1", title: `The ${pack.clue}`, description: `A ${pack.clue} points to who acted at ${pack.keyTime}.`, type: "digital" as const, isRedHerring: false },
      { id: "ev_2", title: "Obvious Motive", description: `${herringName} had the loudest grudge — too obvious.`, type: "testimonial" as const, isRedHerring: true },
    ],
    witnessStatements: [
      { id: "w_1", witnessName: nameAt(base), statement: `${culpritName} was right by ${pack.place} at ${pack.keyTime}.`, reliability: "reliable" as const },
    ],
    timeline: [
      { id: "t_1", time: "Before", description: `${pack.place} is quiet.`, involvedSuspects: [] },
      { id: "t_2", time: pack.keyTime, description: `${culpritName} acts, matching the ${pack.clue}.`, involvedSuspects: [culpritId] },
    ],
    solution: {
      suspectId: culpritId,
      motive: pack.motive,
      weapon: "",
      timelineEventId: "t_2",
      explanation: `${culpritName} did it — the ${pack.clue} puts them at ${pack.place} at ${pack.keyTime}. Motive: ${pack.motive}. ${herringName}'s obvious grudge was a red herring.`,
    },
  };
}

const MINI_PACKS: MiniPack[] = [
  { title: "The Spilled Latte", place: "the corner café", crime: "sabotage", target: "A finished manuscript", roles: ["a rival writer", "the barista", "a quiet regular"], culprit: 0, herring: 1, motive: "sinking a competitor's book", clue: "wifi wipe log", keyTime: "3:02 PM" },
  { title: "The Locker Room Ring", place: "the gym", crime: "theft", target: "A championship ring", roles: ["a new member", "the attendant", "a regular"], culprit: 1, herring: 0, motive: "quick cash", clue: "master-key swipe", keyTime: "6:14 PM" },
  { title: "The Poisoned Bonsai", place: "the office", crime: "sabotage", target: "A prize bonsai", roles: ["a sore-loser coworker", "the cleaner", "facilities"], culprit: 0, herring: 2, motive: "revenge for last year's loss", clue: "after-hours badge-in", keyTime: "7:40 PM" },
  { title: "The Missing Tip Jar", place: "the diner", crime: "theft", target: "The tip jar", roles: ["a busboy", "a late customer", "the line cook"], culprit: 2, herring: 1, motive: "covering a debt", clue: "counter camera", keyTime: "11:20 PM" },
  { title: "The Deleted Playlist", place: "the radio station", crime: "sabotage", target: "The morning playlist", roles: ["a bumped DJ", "the intern", "the producer"], culprit: 0, herring: 2, motive: "airtime jealousy", clue: "console login", keyTime: "5:10 AM" },
  { title: "The Swapped Trophy", place: "the school hall", crime: "theft", target: "The debate trophy", roles: ["a runner-up", "the janitor", "a teacher"], culprit: 0, herring: 1, motive: "wounded pride", clue: "hallway camera", keyTime: "4:05 PM" },
  { title: "The Sour Milk Batch", place: "the creamery", crime: "sabotage", target: "The award batch", roles: ["a rival dairy hand", "the inspector", "a delivery driver"], culprit: 1, herring: 0, motive: "rigging the county fair", clue: "cooler log", keyTime: "2:30 AM" },
  { title: "The Vanished Bicycle", place: "the campus rack", crime: "theft", target: "A racing bicycle", roles: ["a teammate", "a stranger", "the rack attendant"], culprit: 0, herring: 1, motive: "eliminating a race rival", clue: "lock cut-mark", keyTime: "1:15 PM" },
  { title: "The Cut Stage Cable", place: "the club", crime: "sabotage", target: "The headliner's rig", roles: ["the opener", "a roadie", "the sound tech"], culprit: 2, herring: 0, motive: "settling a pay dispute", clue: "backstage badge", keyTime: "8:55 PM" },
  { title: "The Emptied Register", place: "the bookstore", crime: "theft", target: "The register float", roles: ["a temp clerk", "a browser", "the owner's nephew"], culprit: 2, herring: 1, motive: "gambling debt", clue: "till audit trail", keyTime: "6:40 PM" },
  { title: "The Ruined Mural", place: "the plaza", crime: "sabotage", target: "The contest mural", roles: ["a losing artist", "a passerby", "the caretaker"], culprit: 0, herring: 2, motive: "spite over the jury", clue: "paint-store receipt", keyTime: "10:10 PM" },
  { title: "The Faked Time Card", place: "the warehouse", crime: "fraud", target: "The overtime sheet", roles: ["a shift worker", "the supervisor", "a temp"], culprit: 1, herring: 0, motive: "padding a paycheck", clue: "scanner mismatch", keyTime: "9:00 PM" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MEGA case factory (weekly event, 5 suspects + motive/weapon picks)
// ─────────────────────────────────────────────────────────────────────────────
interface MegaPack {
  title: string;
  place: string;
  crime: Crime;
  victimRole: string;
  difficulty: Difficulty;
  suspects: [Role, Role, Role, Role, Role];
  culprit: 0 | 1 | 2 | 3 | 4;
  herring: 0 | 1 | 2 | 3 | 4;
  motives: string[]; // pick options (culprit's true motive included)
  weapons: string[];
  motive: string;
  weapon: string;
  keyTime: string;
  clue: string;
}

function buildMega(pack: MegaPack, availableDate: string, instance: number) {
  const base = 1000 + instance * 7;
  const victimName = nameAt(base);
  const sNames = [1, 2, 3, 4, 5].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const culpritName = sNames[pack.culprit];
  const herringName = sNames[pack.herring];
  return {
    case_: {
      kind: "mega" as const,
      title: pack.title,
      description: `${pack.victimRole}, ${victimName}, is at the center of a high-stakes case at ${pack.place}. Five suspects, one truth — name the culprit, motive, and method.`,
      type: pack.crime,
      difficulty: pack.difficulty,
      status: "active" as const,
      availableDate,
      estimatedMinutes: 30,
      maxScore: pack.difficulty === "expert" ? 3000 : 2500,
      victim: { name: victimName, description: `${pack.victimRole}.`, avatar: "default_victim" },
      suspects: sNames.map((n, i) => ({
        id: `suspect_${i + 1}`,
        name: n,
        description: `${n} — ${pack.suspects[i].role}.`,
        alibi: pack.suspects[i].alibi,
        relationship: pack.suspects[i].rel,
        avatar: "default_suspect",
      })),
      evidence: [
        { id: "ev_1", title: `The ${pack.clue}`, description: `A ${pack.clue} ties someone to ${pack.place} at ${pack.keyTime}.`, type: "digital" as const, isRedHerring: false },
        { id: "ev_2", title: `The ${pack.weapon}`, description: `Forensics link the ${pack.weapon} to the crime.`, type: "physical" as const, isRedHerring: false },
        { id: "ev_3", title: "A Loud Grudge", description: `${herringName}'s public feud with the victim looks damning — and is meant to.`, type: "testimonial" as const, isRedHerring: true },
        { id: "ev_4", title: "Planted Item", description: `Something of ${herringName}'s turns up at the scene, too conveniently.`, type: "physical" as const, isRedHerring: true },
        { id: "ev_5", title: "The Quiet Motive", description: `Records hint at why ${culpritName} needed the victim gone: ${pack.motive}.`, type: "document" as const, isRedHerring: false },
      ],
      witnessStatements: [
        { id: "w_1", witnessName: nameAt(base + 6), statement: `${culpritName} was near ${pack.place} at ${pack.keyTime}, though they denied it.`, reliability: "reliable" as const },
        { id: "w_2", witnessName: nameAt(base + 5), statement: `${herringName} was elsewhere when it happened — I'd swear to it.`, reliability: "uncertain" as const },
      ],
      timeline: [
        { id: "t_1", time: "Setup", description: `Tensions rise at ${pack.place}.`, involvedSuspects: [] },
        { id: "t_2", time: pack.keyTime, description: `${culpritName} is placed at the scene by the ${pack.clue}.`, involvedSuspects: [culpritId] },
        { id: "t_3", time: "Aftermath", description: `The crime is discovered.`, involvedSuspects: [] },
      ],
      megaOptions: { motives: pack.motives, weapons: pack.weapons },
      solution: {
        suspectId: culpritId,
        motive: pack.motive,
        weapon: pack.weapon,
        timelineEventId: "t_2",
        explanation: `${culpritName} did it: the ${pack.clue} and the ${pack.weapon} place them at ${pack.place} at ${pack.keyTime}, driven by ${pack.motive}. Everything pointing at ${herringName} was staged.`,
      },
    },
    title: pack.title,
    difficulty: pack.difficulty,
  };
}

const MEGA_PACKS: MegaPack[] = [
  {
    title: "The Grand Hotel Murder", place: "the Grand Meridian Hotel", crime: "murder",
    victimRole: "a ruthless hotel magnate", difficulty: "expert",
    suspects: [
      { role: "the much-younger spouse", alibi: "claims the rooftop bar", rel: "sole heir" },
      { role: "the fired architect", alibi: "was packing an office", rel: "publicly humiliated" },
      { role: "a rival hotelier", alibi: "was at the gala", rel: "forced out of the company" },
      { role: "the underpaid concierge", alibi: "was at the front desk", rel: "owed years of back pay" },
      { role: "the personal physician", alibi: "retired early with a migraine", rel: "hiding a malpractice secret" },
    ],
    culprit: 3, herring: 1, motives: ["Inheritance", "Revenge for being fired", "Years of unpaid wages", "Covering a medical secret", "Business rivalry"],
    weapons: ["Brass letter opener", "Poisoned wine", "Strangulation scarf", "Blunt object"],
    motive: "Years of unpaid wages", weapon: "Brass letter opener", keyTime: "11:48 PM", clue: "master keycard log",
  },
  {
    title: "Murder at the Midnight Opera", place: "the opera house", crime: "murder",
    victimRole: "a celebrated soprano", difficulty: "hard",
    suspects: [
      { role: "the passed-over understudy", alibi: "was in the wings", rel: "wanted the lead" },
      { role: "the jilted conductor", alibi: "was conducting", rel: "a scorned lover" },
      { role: "the indebted producer", alibi: "watched from a box", rel: "insured the victim heavily" },
      { role: "the blamed costume mistress", alibi: "was steaming costumes", rel: "publicly humiliated" },
      { role: "an obsessive superfan", alibi: "was front-row", rel: "recently banned" },
    ],
    culprit: 3, herring: 4, motives: ["Jealousy over the role", "A scorned affair", "An insurance payout", "Public humiliation and revenge", "Obsession"],
    weapons: ["Poisoned throat spray", "Toxic costume pin", "Tainted champagne", "Sabotaged rigging"],
    motive: "Public humiliation and revenge", weapon: "Poisoned throat spray", keyTime: "9:20 PM", clue: "dressing-room sign-in",
  },
  {
    title: "The Cliffside Manor Heist", place: "Cliffside Manor", crime: "theft",
    victimRole: "an eccentric art collector", difficulty: "expert",
    suspects: [
      { role: "the private curator", alibi: "was in the archive", rel: "knows the collection's secrets" },
      { role: "a black-market broker", alibi: "claims to be abroad", rel: "has buyers waiting" },
      { role: "the estate's heir", alibi: "was in the city", rel: "drowning in debt" },
      { role: "the head of security", alibi: "was reviewing footage", rel: "built the alarm grid" },
      { role: "a restoration artist", alibi: "was in the studio", rel: "can forge a masterpiece" },
    ],
    culprit: 3, herring: 2, motives: ["A collector's obsession", "A waiting buyer", "Crushing debt", "The perfect inside job", "Artistic revenge"],
    weapons: ["Alarm bypass code", "Forged replacement canvas", "Drugged guard's coffee", "Cut display glass"],
    motive: "The perfect inside job", weapon: "Alarm bypass code", keyTime: "1:30 AM", clue: "alarm control log",
  },
  {
    title: "Sabotage at the Space Center", place: "the launch center", crime: "sabotage",
    victimRole: "a flagship satellite program", difficulty: "hard",
    suspects: [
      { role: "a demoted engineer", alibi: "was in simulations", rel: "blamed for a past failure" },
      { role: "a foreign contractor", alibi: "was off-site", rel: "under suspicion for leaks" },
      { role: "the launch director", alibi: "was in mission control", rel: "staked their career on it" },
      { role: "a whistleblower tech", alibi: "was on the floor", rel: "warned of safety cuts" },
      { role: "the budget officer", alibi: "was in meetings", rel: "hid the overruns" },
    ],
    culprit: 4, herring: 1, motives: ["Career revenge", "Corporate espionage", "Protecting a reputation", "Exposing a cover-up", "Hiding fraud"],
    weapons: ["Corrupted firmware", "Loosened coupling", "Falsified test data", "Cut sensor line"],
    motive: "Hiding fraud", weapon: "Falsified test data", keyTime: "4:00 AM", clue: "control-room access log",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STORY-ARC chapter factory + two arcs
// ─────────────────────────────────────────────────────────────────────────────
interface ChapterPack {
  type: "investigation" | "interrogation" | "discovery" | "twist" | "final_reveal";
  crime: Crime;
  difficulty: Difficulty;
  title: string;
  storyText: string;
  cliffhanger: string;
  place: string;
  victimRole: string;
  suspects: [Role, Role, Role];
  culprit: 0 | 1 | 2;
  herring: 0 | 1 | 2;
  motive: string;
  motives: string[];
  clue: string;
  keyTime: string;
}

function buildChapter(pack: ChapterPack, seasonId: string, n: number, availableDate: string) {
  const base = 2000 + n * 5;
  const victimName = nameAt(base);
  const sNames = [1, 2, 3].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const culpritName = sNames[pack.culprit];
  const herringName = sNames[pack.herring];
  return {
    kind: "chapter" as const,
    seasonId,
    chapterNumber: n,
    chapterType: pack.type,
    title: pack.title,
    description: `Chapter ${n}: ${pack.storyText.slice(0, 90)}…`,
    storyText: pack.storyText,
    cliffhanger: pack.cliffhanger,
    type: pack.crime,
    difficulty: pack.difficulty,
    status: "active" as const,
    availableDate,
    estimatedMinutes: 8,
    maxScore: 1000,
    victim: { name: victimName, description: `${pack.victimRole}.`, avatar: "default_victim" },
    suspects: sNames.map((nm, i) => ({
      id: `suspect_${i + 1}`,
      name: nm,
      description: `${nm} — ${pack.suspects[i].role}.`,
      alibi: pack.suspects[i].alibi,
      relationship: pack.suspects[i].rel,
      avatar: "default_suspect",
    })),
    evidence: [
      { id: "ev_1", title: `The ${pack.clue}`, description: `A ${pack.clue} points to ${pack.place} at ${pack.keyTime}.`, type: "digital" as const, isRedHerring: false },
      { id: "ev_2", title: "A Staged Trail", description: `Evidence pointing at ${herringName} was left too neatly.`, type: "physical" as const, isRedHerring: true },
    ],
    witnessStatements: [
      { id: "w_1", witnessName: nameAt(base + 4), statement: `${culpritName} was where they claimed not to be.`, reliability: "reliable" as const },
    ],
    timeline: [
      { id: "t_1", time: "Earlier", description: `The scene at ${pack.place} is set.`, involvedSuspects: [] },
      { id: "t_2", time: pack.keyTime, description: `${culpritName} acts, matching the ${pack.clue}.`, involvedSuspects: [culpritId] },
      { id: "t_3", time: "After", description: `The truth of this chapter surfaces.`, involvedSuspects: [] },
    ],
    megaOptions: { motives: pack.motives, weapons: [] },
    solution: {
      suspectId: culpritId,
      motive: pack.motive,
      weapon: "",
      timelineEventId: "t_2",
      explanation: `${culpritName} is behind this chapter — the ${pack.clue} betrays them, driven by ${pack.motive}. The trail toward ${herringName} was planted.`,
    },
  };
}

const ARC_1: { title: string; subtitle: string; description: string; chapters: ChapterPack[] } = {
  title: "The Shadow Syndicate",
  subtitle: "Season 1",
  description: "A flawless vault heist unravels into a city-wide conspiracy. Six chapters. One mastermind.",
  chapters: [
    { type: "investigation", crime: "theft", difficulty: "easy", title: "The Vanishing Vault", place: "the Meridian vault", victimRole: "a robbed private vault", storyText: "The Meridian vault, untouched for forty years, is empty. No alarm, no forced entry — someone inside opened the door.", cliffhanger: "An unidentified print on the dial matches no employee on record.", suspects: [{ role: "the night security supervisor", alibi: "was on rounds", rel: "holds a master override" }, { role: "the aging locksmith", alibi: "claims to be asleep", rel: "installed the vault" }, { role: "a junior auditor", alibi: "left at nine", rel: "had the vault schedule" }], culprit: 0, herring: 2, motive: "blackmail by a stranger", motives: ["Gambling debt", "Revenge for a demotion", "Blackmail by a stranger", "Pure greed"], clue: "override log", keyTime: "2:14 AM" },
    { type: "interrogation", crime: "fraud", difficulty: "easy", title: "The Reluctant Witness", place: "the bank", victimRole: "a threatened investigation", storyText: "A bank clerk requests protection — she processed a suspicious transfer the same night. Then she recants.", cliffhanger: "She got a call from a blocked number minutes before changing her story.", suspects: [{ role: "her bank supervisor", alibi: "was in a meeting", rel: "approved the transfer" }, { role: "the assigned detective", alibi: "was at the precinct", rel: "had her address" }, { role: "a frequent consultant", alibi: "claims to be abroad", rel: "unknown ties" }], culprit: 0, herring: 2, motive: "a cut of the stolen bonds", motives: ["Protecting the money", "Fear for family", "A cut of the bonds", "Old loyalty"], clue: "call record", keyTime: "4:58 PM" },
    { type: "discovery", crime: "sabotage", difficulty: "medium", title: "Eyes in the Dark", place: "the backup server room", victimRole: "sabotaged footage", storyText: "A backup server holds the real vault footage. The team races to recover it before it's erased.", cliffhanger: "The file is corrupted exactly at the 2:14 AM mark.", suspects: [{ role: "the IT administrator", alibi: "was running backups", rel: "full server access" }, { role: "a camera contractor", alibi: "finished early", rel: "physical access" }, { role: "a data analyst", alibi: "never touched it", rel: "requested the footage" }], culprit: 0, herring: 1, motive: "being on the syndicate payroll", motives: ["On the payroll", "Hiding a mistake", "Coerced by threats", "Jealousy"], clue: "deletion log", keyTime: "8:02 AM" },
    { type: "twist", crime: "fraud", difficulty: "medium", title: "The Badge and the Bribe", place: "the precinct", victimRole: "a corrupted department", storyText: "Every step, the syndicate stayed ahead. There's only one explanation — a cop is feeding them information.", cliffhanger: "A second name on the bribe ledger is redacted — someone far above.", suspects: [{ role: "the lead detective", alibi: "followed every lead", rel: "buried two reports" }, { role: "the evidence sergeant", alibi: "claims clean logs", rel: "controls custody" }, { role: "an eager rookie", alibi: "just files paperwork", rel: "new to the precinct" }], culprit: 0, herring: 2, motive: "syndicate payoffs", motives: ["Paid off", "Pressured by a superior", "Protecting a relative", "A grudge"], clue: "bribe ledger", keyTime: "Week 2" },
    { type: "investigation", crime: "murder", difficulty: "hard", title: "The Missing Man", place: "the safehouse", victimRole: "a witness ready to testify", storyText: "The syndicate's accountant wanted a deal. They wanted his silence. They got it.", cliffhanger: "His notebook is missing one page — and it names a traitor on the team.", suspects: [{ role: "his task-force handler", alibi: "was at the safehouse", rel: "knew his location" }, { role: "a syndicate enforcer", alibi: "was at a bar", rel: "known for cleanups" }, { role: "his estranged brother", alibi: "hadn't spoken in years", rel: "stood to inherit" }], culprit: 0, herring: 2, motive: "hiding her role as the mole", motives: ["Hiding the mole", "A contract", "Inheritance", "Silencing a witness"], clue: "safehouse keycard", keyTime: "4:40 AM" },
    { type: "final_reveal", crime: "murder", difficulty: "expert", title: "The Mastermind", place: "police headquarters", victimRole: "a city held hostage", storyText: "The blackmail, the bribes, the dead accountant — all one mind hiding in plain sight. Tonight it gets a face.", cliffhanger: "Case closed — but the last page hints the network reaches one city over…", suspects: [{ role: "the department commissioner", alibi: "led the task force", rel: "oversaw every step" }, { role: "the exposed mole", alibi: "only took orders", rel: "already confessed" }, { role: "the money consultant", alibi: "just a middleman", rel: "moves the funds" }], culprit: 0, herring: 2, motive: "building an empire from behind a badge", motives: ["A hidden empire", "An old debt", "Protecting a legacy", "Greed"], clue: "torn notebook page", keyTime: "Tonight" },
  ],
};

const ARC_2: { title: string; subtitle: string; description: string; chapters: ChapterPack[] } = {
  title: "The Harbor Conspiracy",
  subtitle: "Season 2",
  description: "A drowned dockworker pulls the city's port authority into a web of smuggling, bribes, and betrayal. Six chapters to the tide's turn.",
  chapters: [
    { type: "investigation", crime: "murder", difficulty: "easy", title: "Body in the Bay", place: "Pier 9", victimRole: "a drowned dockworker", storyText: "A night-shift dockhand washes up at Pier 9. Ruled an accident — until the bruises don't match a fall.", cliffhanger: "His logbook lists a container that officially never arrived.", suspects: [{ role: "the shift foreman", alibi: "was in the yard office", rel: "signs every manifest" }, { role: "a fellow dockhand", alibi: "was loading a truck", rel: "argued with the victim" }, { role: "the harbor patrol officer", alibi: "was on the water", rel: "first on scene" }], culprit: 0, herring: 1, motive: "the victim saw the ghost container", motives: ["Silencing a witness", "A personal feud", "Covering a theft", "Fear of exposure"], clue: "gate camera", keyTime: "1:10 AM" },
    { type: "discovery", crime: "theft", difficulty: "easy", title: "The Ghost Container", place: "the container yard", victimRole: "a missing shipment", storyText: "The container that killed a man doesn't exist on paper. The team hunts it through the stacks before it ships out.", cliffhanger: "Its seal number belongs to a company dissolved a decade ago.", suspects: [{ role: "the yard crane operator", alibi: "was on break", rel: "moves every box" }, { role: "a customs clerk", alibi: "was at lunch", rel: "clears the paperwork" }, { role: "a freight broker", alibi: "was off-site", rel: "booked the slot" }], culprit: 1, herring: 0, motive: "waving smuggled cargo through", motives: ["A bribe", "Blackmail", "A cut of the cargo", "Loyalty to the ring"], clue: "customs override", keyTime: "6:20 AM" },
    { type: "interrogation", crime: "fraud", difficulty: "medium", title: "The Paper Tide", place: "the port authority office", victimRole: "a falsified ledger", storyText: "The smuggling runs on forged manifests. One official's signature is on all of them — but they swear they never signed.", cliffhanger: "The signatures are real. The official's stamp was used while they were overseas.", suspects: [{ role: "the deputy port director", alibi: "was traveling", rel: "owns the stamp" }, { role: "an office administrator", alibi: "was at her desk", rel: "keeps the stamp" }, { role: "an IT auditor", alibi: "was patching systems", rel: "can backdate records" }], culprit: 1, herring: 0, motive: "forging approvals for the ring", motives: ["Under the ring's pay", "Coerced", "Skimming fees", "Protecting a boss"], clue: "stamp-room badge", keyTime: "3:40 PM" },
    { type: "twist", crime: "sabotage", difficulty: "medium", title: "The Drowned Evidence", place: "the evidence dock", victimRole: "sabotaged proof", storyText: "The seized manifests are the whole case. Overnight, a sprinkler 'malfunction' soaks the evidence locker.", cliffhanger: "The sprinkler was triggered manually — by someone with a case-team key.", suspects: [{ role: "the evidence clerk", alibi: "had gone home", rel: "controls the locker" }, { role: "a task-force officer", alibi: "was on patrol", rel: "wanted the case dropped" }, { role: "a building engineer", alibi: "was fixing the boiler", rel: "knows the sprinkler panel" }], culprit: 1, herring: 2, motive: "burying proof they were paid to hide", motives: ["A payoff", "Fear of being named", "A grudge", "Following orders"], clue: "sprinkler panel log", keyTime: "2:50 AM" },
    { type: "investigation", crime: "disappearance", difficulty: "hard", title: "The Vanished Informant", place: "a waterfront motel", victimRole: "a smuggling informant", storyText: "A dockworker agrees to name the ring's boss. Before dawn, his motel room is empty and his phone is in the harbor.", cliffhanger: "The room key was last used by a badge, not a guest.", suspects: [{ role: "his police handler", alibi: "was at the station", rel: "arranged the meeting" }, { role: "a ring enforcer", alibi: "was seen downtown", rel: "hunts leaks" }, { role: "the motel manager", alibi: "was at the desk", rel: "keeps the master key" }], culprit: 0, herring: 1, motive: "silencing the man who'd name them", motives: ["Protecting the boss", "A contract", "Self-preservation", "A bribe"], clue: "keycard log", keyTime: "5:05 AM" },
    { type: "final_reveal", crime: "murder", difficulty: "expert", title: "The Harbormaster", place: "the harbormaster's tower", victimRole: "a port strangled by one hand", storyText: "Every forged manifest, every bribe, every body — routed through one office with a view of the whole harbor. Tonight the tide goes out on them.", cliffhanger: "The ring is broken — but a wire transfer flags a sister port up the coast…", suspects: [{ role: "the harbormaster", alibi: "was 'reviewing tides'", rel: "oversees the entire port" }, { role: "the deputy director", alibi: "cooperated fully", rel: "took the earlier fall" }, { role: "the freight broker", alibi: "just a vendor", rel: "moved the money" }], culprit: 0, herring: 1, motive: "running the smuggling empire from the tower", motives: ["A smuggling empire", "An old debt", "Protecting a dynasty", "Greed"], clue: "master control log", keyTime: "Midnight" },
  ],
};

// ── Reward configs ───────────────────────────────────────────────────────────
const EVENT_REWARDS = {
  top1: { title: "event_title_grandmaster", xp: 5000, coins: 2000 },
  top10: { badge: "event_badge_elite", xp: 2000, coins: 1000 },
  top100: { xp: 500, coins: 300 },
  participation: { xp: 100, coins: 50 },
};
const SEASON_REWARDS = {
  chapter: { xp: 300, coins: 30 },
  milestones: [{ atChapter: 5, xp: 1000, coins: 200, badge: "season_badge_halfway" }],
  completion: { xp: 3000, coins: 500, title: "season_title_closer", badge: "season_badge_complete", avatar: "season_avatar_ace" },
};

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  await connectDatabase();
  const db = mongoose.connection.db!;
  logger.info(`Launch content: anchoring calendar to ${ymd(TODAY)} for ${TOTAL_DAYS} days.`);

  // ── 1. Reset the existing content calendar (pre-launch clean slate) ──
  const delCases = await Case.deleteMany({ kind: { $in: ["daily", "mini", "mega", "chapter"] } });
  const delEvents = await Event.deleteMany({});
  const delSeasons = await Season.deleteMany({});
  // Clear now-dangling progress so leaderboards/participation aren't orphaned.
  await db.collection("eventparticipations").deleteMany({}).catch(() => {});
  await db.collection("seasonprogresses").deleteMany({}).catch(() => {});
  logger.info(`Reset: removed ${delCases.deletedCount} cases, ${delEvents.deletedCount} events, ${delSeasons.deletedCount} seasons.`);

  const docs: any[] = [];

  // ── 2. Daily cases: reuse authored batch-01 for the first 30 days, then generate. ──
  const batchPath = path.resolve(process.cwd(), "content/daily-cases-batch-01.json");
  let authored: any[] = [];
  if (fs.existsSync(batchPath)) {
    authored = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  }
  const dailyDifficultyCycle: Difficulty[] = ["medium", "hard", "medium", "expert", "hard", "easy", "medium", "hard"];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = ymd(dayDate(i));
    if (i < authored.length) {
      docs.push({ ...authored[i], kind: "daily", status: "active", availableDate: date });
    } else {
      const pack = DAILY_PACKS[i % DAILY_PACKS.length];
      const diff = dailyDifficultyCycle[i % dailyDifficultyCycle.length];
      docs.push(buildDaily(pack, date, diff, i));
    }
  }
  const dailyCount = TOTAL_DAYS;

  // ── 3. Mini cases: 3 per day, rotating the pool + names. ──
  let miniCount = 0;
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = ymd(dayDate(i));
    for (let j = 0; j < 3; j++) {
      const packIdx = (i * 3 + j) % MINI_PACKS.length;
      docs.push(buildMini(MINI_PACKS[packIdx], date, i * 3 + j));
      miniCount++;
    }
  }

  await Case.insertMany(docs);
  logger.info(`Inserted ${dailyCount} daily + ${miniCount} mini cases.`);

  // ── 4. Weekly mega events (continuous weekly coverage). ──
  const weeks = Math.ceil(TOTAL_DAYS / 7); // 9
  let megaCount = 0;
  for (let w = 0; w < weeks; w++) {
    const pack = MEGA_PACKS[w % MEGA_PACKS.length];
    // Week 0 starts an hour ago so there is always a LIVE mega right away;
    // later weeks start at 18:00 UTC on their day. Continuous weekly coverage.
    const start =
      w === 0
        ? new Date(Date.now() - HOUR_MS)
        : new Date(dayDate(w * 7).getTime() + 18 * HOUR_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS - HOUR_MS);
    const built = buildMega(pack, ymd(start), w);
    const caseDoc = await Case.create(built.case_);
    const status = start.getTime() <= Date.now() && end.getTime() > Date.now() ? "active" : start.getTime() > Date.now() ? "upcoming" : "completed";
    const ev = await Event.create({
      title: `${built.title} — Week ${w + 1}`,
      description: built.case_.description,
      image: "",
      caseId: caseDoc.id,
      startDate: start,
      endDate: end,
      status,
      difficulty: built.difficulty,
      rewardConfig: EVENT_REWARDS,
      leaderboardEnabled: true,
      targetCompletionSec: 1800,
      createdBy: "launch-seed",
    });
    await Case.findByIdAndUpdate(caseDoc.id, { eventId: ev.id });
    megaCount++;
  }
  logger.info(`Created ${megaCount} weekly mega events.`);

  // ── 5. Two back-to-back story-arc seasons (6 chapters each). ──
  const arcs = [
    { arc: ARC_1, startOffset: 0, status: "active" as const },
    { arc: ARC_2, startOffset: 31, status: "upcoming" as const },
  ];
  let chapterCount = 0;
  for (const { arc, startOffset, status } of arcs) {
    const startDate = dayDate(startOffset);
    const endDate = dayDate(startOffset + 31);
    const cadence = 5; // ~6 chapters across a month
    const season = await Season.create({
      title: arc.title,
      subtitle: arc.subtitle,
      description: arc.description,
      difficulty: "hard",
      startDate,
      endDate,
      totalChapters: arc.chapters.length,
      status,
      rewards: SEASON_REWARDS,
      unlockCadenceDays: cadence,
      leaderboardEnabled: true,
      createdBy: "launch-seed",
    });
    for (let c = 0; c < arc.chapters.length; c++) {
      const unlock = dayDate(startOffset + c * cadence);
      await Case.create(buildChapter(arc.chapters[c], season.id, c + 1, ymd(unlock)));
      chapterCount++;
    }
    logger.info(`Created season "${arc.title}" (${status}) with ${arc.chapters.length} chapters.`);
  }

  // ── Summary ──
  logger.info("──────────────────────────────────────────────");
  logger.info(`DONE. Daily=${dailyCount}, Mini=${miniCount}, Mega=${megaCount}, Seasons=2 (${chapterCount} chapters).`);
  logger.info(`First daily case date: ${ymd(dayDate(0))}  |  Last: ${ymd(dayDate(TOTAL_DAYS - 1))}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error("Launch content seed failed:", err);
  process.exit(1);
});
