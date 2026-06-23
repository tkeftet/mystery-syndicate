/**
 * Seed an example Story Arc season. Run:  yarn seed:season
 *
 * Creates "Season 1: The Shadow Syndicate" with 6 chapters. The season is
 * back-dated 5 days so every chapter is date-unlocked already — the sequential
 * "finish the previous chapter first" gate still applies, so you can play the
 * whole arc in one sitting (hits the 5-chapter milestone + completion at ch 6).
 *
 * Idempotent — skips if a Season already exists. Add real seasons via the (future)
 * web admin or by extending CHAPTERS here.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Case } from "../modules/cases/case.model";
import { Season } from "../modules/seasons/season.model";
import { logger } from "../utils/logger";

const now = new Date();
const DAY = 86400000;
const ymd = (d: Date) => d.toISOString().split("T")[0];

const REWARDS = {
  chapter: { xp: 300, coins: 30 },
  milestones: [
    {
      atChapter: 5,
      xp: 1000,
      coins: 200,
      badge: "season1_badge_halfway",
    },
  ],
  completion: {
    xp: 3000,
    coins: 500,
    title: "season1_title_syndicate_breaker",
    badge: "season1_badge_complete",
    avatar: "season1_avatar_shadow",
  },
};

type ChapterDef = {
  type:
    | "investigation"
    | "interrogation"
    | "discovery"
    | "twist"
    | "final_reveal";
  crime: "murder" | "theft" | "disappearance" | "sabotage" | "fraud";
  difficulty: "easy" | "medium" | "hard" | "expert";
  title: string;
  description: string;
  storyText: string;
  cliffhanger: string;
  victim: { name: string; description: string };
  suspects: Array<{ id: string; name: string; description: string; alibi: string; relationship: string }>;
  evidence: Array<{ id: string; title: string; description: string; type: "physical" | "digital" | "testimonial" | "document"; isRedHerring?: boolean }>;
  witnesses: Array<{ id: string; witnessName: string; statement: string; reliability: "reliable" | "unreliable" | "uncertain" }>;
  timeline: Array<{ id: string; time: string; description: string; involvedSuspects: string[] }>;
  motives: string[];
  solution: { suspectId: string; motive: string; timelineEventId: string; explanation: string };
};

const CHAPTERS: ChapterDef[] = [
  {
    type: "investigation",
    crime: "theft",
    difficulty: "easy",
    title: "The Vanishing Vault",
    description: "A fortune in bearer bonds vanishes from a 'impenetrable' private vault overnight.",
    storyText:
      "It begins with a whisper in the financial district: the Meridian vault, untouched for forty years, is empty. No alarm. No forced entry. Someone on the inside opened the door.",
    cliffhanger: "An unidentified fingerprint was lifted from the vault dial — it belongs to no employee on record.",
    victim: { name: "Meridian Holdings", description: "A private investment vault, robbed of $4M in bonds." },
    suspects: [
      { id: "suspect_1", name: "Dana Okafor", description: "The night security supervisor.", alibi: "Says she was on her rounds.", relationship: "Holds a master override code." },
      { id: "suspect_2", name: "Victor Lindqvist", description: "The vault's aging locksmith.", alibi: "Claims he was home asleep.", relationship: "Installed the vault decades ago." },
      { id: "suspect_3", name: "Priya Nair", description: "A junior auditor working late.", alibi: "Says she left at 9 PM.", relationship: "Had access to the vault schedule." },
    ],
    evidence: [
      { id: "ev_1", title: "Override Log", description: "A master override was used at 2:14 AM.", type: "digital" },
      { id: "ev_2", title: "Cut Camera Feed", description: "The vault camera looped 10 minutes of old footage.", type: "digital" },
      { id: "ev_3", title: "Coffee Receipt", description: "An all-night diner receipt timestamped 1:50 AM, blocks away.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Janitor", statement: "I saw the supervisor near the vault long after her rounds ended.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "1:50 AM", description: "An auditor's badge pings at the side entrance.", involvedSuspects: ["suspect_3"] },
      { id: "t_2", time: "2:14 AM", description: "The master override opens the vault.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "2:30 AM", description: "Camera feed resumes; bonds are gone.", involvedSuspects: [] },
    ],
    motives: ["Crippling gambling debt", "Revenge for a demotion", "Blackmailed by a stranger", "Pure greed"],
    solution: { suspectId: "suspect_1", motive: "Blackmailed by a stranger", timelineEventId: "t_2", explanation: "Dana used her override at 2:14 AM and looped the camera. She wasn't acting alone — a stranger held a secret over her." },
  },
  {
    type: "interrogation",
    crime: "fraud",
    difficulty: "easy",
    title: "The Reluctant Witness",
    description: "A terrified clerk comes forward claiming she knows who ordered the vault job — then changes her story.",
    storyText:
      "Dana won't name her blackmailer. But a bank clerk, Lena, requests protection: she processed a suspicious transfer the same night. Someone got to her first.",
    cliffhanger: "Lena received a phone call from a blocked number minutes before she recanted. The syndicate is listening.",
    victim: { name: "The Investigation", description: "Witness tampering threatens the case." },
    suspects: [
      { id: "suspect_1", name: "Marco Reyes", description: "Lena's supervisor at the bank.", alibi: "Says he was in a meeting.", relationship: "Approved the suspicious transfer." },
      { id: "suspect_2", name: "Detective Hale", description: "The officer first assigned the case.", alibi: "Claims he was at the precinct.", relationship: "Had Lena's protected address." },
      { id: "suspect_3", name: "Tomas Vega", description: "A 'consultant' who visits the bank often.", alibi: "Says he was abroad.", relationship: "Unknown ties to the transfer." },
    ],
    evidence: [
      { id: "ev_1", title: "Call Record", description: "A blocked call reached Lena at 4:58 PM.", type: "digital" },
      { id: "ev_2", title: "Transfer Slip", description: "A $4M transfer approved by a bank supervisor.", type: "document" },
      { id: "ev_3", title: "Visitor Badge", description: "A consultant badge scanned the day before — flagged but routine.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Receptionist", statement: "Her supervisor stepped out to take a call right before she got scared.", reliability: "uncertain" },
    ],
    timeline: [
      { id: "t_1", time: "4:55 PM", description: "Lena begins her statement.", involvedSuspects: [] },
      { id: "t_2", time: "4:58 PM", description: "A blocked call is placed to Lena's phone.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "5:10 PM", description: "Lena recants everything.", involvedSuspects: [] },
    ],
    motives: ["Protecting the syndicate's money", "Fear for his family", "Cut of the stolen bonds", "Loyalty to an old friend"],
    solution: { suspectId: "suspect_1", motive: "Cut of the stolen bonds", timelineEventId: "t_2", explanation: "Marco approved the transfer and made the blocked call to silence Lena, for a cut of the bonds." },
  },
  {
    type: "discovery",
    crime: "sabotage",
    difficulty: "medium",
    title: "Eyes in the Dark",
    description: "Recovered security footage finally shows a face — until the file is mysteriously corrupted.",
    storyText:
      "A backup server holds the real vault footage. The team races to recover it before the syndicate erases the truth.",
    cliffhanger: "The recovered file is corrupted exactly at the 2:14 AM mark. Someone with technical access got there first.",
    victim: { name: "The Backup Server", description: "Critical footage sabotaged before recovery." },
    suspects: [
      { id: "suspect_1", name: "Erin Cho", description: "The bank's IT administrator.", alibi: "Says she was running backups.", relationship: "Full server access." },
      { id: "suspect_2", name: "Sam Doyle", description: "A contractor servicing the cameras.", alibi: "Claims he finished early.", relationship: "Physical access to the camera room." },
      { id: "suspect_3", name: "Nadia Frost", description: "A data analyst on loan from HQ.", alibi: "Says she never touched the server.", relationship: "Requested the footage that morning." },
    ],
    evidence: [
      { id: "ev_1", title: "Deletion Log", description: "A targeted wipe ran on the footage partition at 8:02 AM.", type: "digital" },
      { id: "ev_2", title: "Server Login", description: "The IT admin account was active during the wipe.", type: "digital" },
      { id: "ev_3", title: "Coffee Mug", description: "A contractor's mug left in the server room.", type: "physical", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Intern", statement: "The IT admin told me to take an early break that morning.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "7:45 AM", description: "The footage is queued for recovery.", involvedSuspects: ["suspect_3"] },
      { id: "t_2", time: "8:02 AM", description: "A targeted wipe corrupts the file.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "8:30 AM", description: "Recovery fails; the face is lost.", involvedSuspects: [] },
    ],
    motives: ["On the syndicate payroll", "Hiding her own mistake", "Coerced by threats", "Professional jealousy"],
    solution: { suspectId: "suspect_1", motive: "On the syndicate payroll", timelineEventId: "t_2", explanation: "Erin used her admin access to wipe the footage at 8:02 AM — she's on the syndicate's payroll." },
  },
  {
    type: "twist",
    crime: "fraud",
    difficulty: "medium",
    title: "The Badge and the Bribe",
    description: "The trail points somewhere no one wanted to look: inside the police department itself.",
    storyText:
      "Every leak, every tip-off, every step the syndicate stayed ahead. There's only one explanation — a cop is feeding them information.",
    cliffhanger: "The dirty officer didn't act alone. A second name is redacted from the bribe ledger — someone far above.",
    victim: { name: "The Department", description: "Corruption discovered in the ranks." },
    suspects: [
      { id: "suspect_1", name: "Detective Hale", description: "First on the vault case.", alibi: "Says he followed every lead.", relationship: "Buried two key reports." },
      { id: "suspect_2", name: "Sgt. Boon", description: "Evidence room sergeant.", alibi: "Claims clean logs.", relationship: "Controls chain of custody." },
      { id: "suspect_3", name: "Officer Pike", description: "A rookie eager to please.", alibi: "Says he just files paperwork.", relationship: "New to the precinct." },
    ],
    evidence: [
      { id: "ev_1", title: "Bribe Ledger", description: "Offshore payments matched to a detective's badge number.", type: "document" },
      { id: "ev_2", title: "Buried Report", description: "Two reports on the vault were never filed.", type: "document" },
      { id: "ev_3", title: "New Watch", description: "A rookie's expensive new watch.", type: "physical", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Clerk", statement: "The detective asked me to 'lose' a file.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "Week 1", description: "Reports go missing from the case file.", involvedSuspects: ["suspect_1"] },
      { id: "t_2", time: "Week 2", description: "An offshore payment lands matching a badge number.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "Week 3", description: "The syndicate evades a raid hours early.", involvedSuspects: [] },
    ],
    motives: ["Paid off by the syndicate", "Pressured by a superior", "Protecting a relative", "Settling a grudge"],
    solution: { suspectId: "suspect_1", motive: "Paid off by the syndicate", timelineEventId: "t_2", explanation: "Detective Hale buried reports and took offshore payments — the badge number on the ledger is his." },
  },
  {
    type: "investigation",
    crime: "murder",
    difficulty: "hard",
    title: "The Missing Man",
    description: "The syndicate's accountant agrees to testify — and is found dead before dawn.",
    storyText:
      "The accountant, Reuben, held the whole network in a notebook. He wanted a deal. The syndicate wanted his silence. They got it.",
    cliffhanger: "Reuben's notebook is missing one page — and it names a traitor inside the investigation team.",
    victim: { name: "Reuben Vass", description: "The syndicate's accountant, ready to testify. Found dead at 5 AM." },
    suspects: [
      { id: "suspect_1", name: "Carla Munize", description: "His handler on the task force.", alibi: "Says she was at the safehouse.", relationship: "Knew his location." },
      { id: "suspect_2", name: "Big Eli", description: "A syndicate enforcer.", alibi: "Claims he was at a bar.", relationship: "Known for 'cleanups'." },
      { id: "suspect_3", name: "Reuben's brother", description: "Estranged and in debt.", alibi: "Says he hadn't spoken to Reuben in years.", relationship: "Stood to inherit." },
    ],
    evidence: [
      { id: "ev_1", title: "Safehouse Keycard", description: "Only the handler's card opened the safehouse at 4:40 AM.", type: "digital" },
      { id: "ev_2", title: "Silencer Thread", description: "Fibers from a suppressed weapon, task-force issue.", type: "physical" },
      { id: "ev_3", title: "Pawn Ticket", description: "The brother pawned a watch that week.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Neighbor", statement: "A car with government plates left the safehouse before dawn.", reliability: "uncertain" },
    ],
    timeline: [
      { id: "t_1", time: "4:40 AM", description: "The safehouse door opens with a handler's card.", involvedSuspects: ["suspect_1"] },
      { id: "t_2", time: "4:55 AM", description: "A suppressed shot; Reuben is killed.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "5:10 AM", description: "The notebook page is torn out.", involvedSuspects: [] },
    ],
    motives: ["Hiding her role as the mole", "A syndicate contract", "Inheritance", "Silencing a witness"],
    solution: { suspectId: "suspect_1", motive: "Hiding her role as the mole", timelineEventId: "t_2", explanation: "Carla, the handler, used her keycard and task-force weapon to silence Reuben — she's the traitor he was about to name." },
  },
  {
    type: "final_reveal",
    crime: "murder",
    difficulty: "expert",
    title: "The Mastermind",
    description: "Every thread leads to one person who has been one step ahead the entire time.",
    storyText:
      "The blackmail, the bribes, the corrupted footage, the dead accountant — all orchestrated by a single mind hiding in plain sight. Tonight, the Shadow Syndicate gets a face.",
    cliffhanger: "Case closed. But the final page of Reuben's notebook hints the network reaches one city over…",
    victim: { name: "The City", description: "Held hostage by the Shadow Syndicate." },
    suspects: [
      { id: "suspect_1", name: "Commissioner Vane", description: "The respected head of the department.", alibi: "Says he was leading the task force.", relationship: "Oversaw every step of the case." },
      { id: "suspect_2", name: "Carla Munize", description: "The exposed mole, now in custody.", alibi: "Claims she only took orders.", relationship: "Confessed to one murder." },
      { id: "suspect_3", name: "Tomas Vega", description: "The mysterious consultant.", alibi: "Says he's just a middleman.", relationship: "Moves the syndicate's money." },
    ],
    evidence: [
      { id: "ev_1", title: "The Torn Page", description: "Reuben's missing page names the one who gives the orders: the Commissioner.", type: "document" },
      { id: "ev_2", title: "Override Origin", description: "The vault blackmail traces to the Commissioner's private line.", type: "digital" },
      { id: "ev_3", title: "Consultant's Invoice", description: "Vega's payments — routed, not ordered, by him.", type: "document", isRedHerring: true },
    ],
    witnesses: [
      { id: "w_1", witnessName: "Carla (in custody)", statement: "Every order came from the top. From Vane.", reliability: "reliable" },
    ],
    timeline: [
      { id: "t_1", time: "Day 1", description: "The Commissioner assigns himself oversight of the vault case.", involvedSuspects: ["suspect_1"] },
      { id: "t_2", time: "Throughout", description: "Every leak aligns with his briefings.", involvedSuspects: ["suspect_1"] },
      { id: "t_3", time: "Tonight", description: "The torn page names him outright.", involvedSuspects: ["suspect_1"] },
    ],
    motives: ["Building a criminal empire from behind a badge", "Forced by an old debt", "Protecting his legacy", "Greed"],
    solution: { suspectId: "suspect_1", motive: "Building a criminal empire from behind a badge", timelineEventId: "t_3", explanation: "Commissioner Vane is the Shadow Syndicate — he used his oversight to orchestrate the theft, the cover-ups, and the murder. Reuben's torn page names him." },
  },
];

async function run() {
  await connectDatabase();

  const existing = await Season.countDocuments();
  if (existing > 0) {
    logger.info(`Seasons already seeded (${existing}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const startDate = new Date(now.getTime() - 5 * DAY); // back-dated for testing
  const endDate = new Date(now.getTime() + 5 * DAY);

  const season = await Season.create({
    title: "The Shadow Syndicate",
    subtitle: "Season 1",
    description:
      "A flawless vault heist unravels into a city-wide conspiracy. Six chapters. One mastermind. Can you unmask the Shadow Syndicate?",
    difficulty: "hard",
    startDate,
    endDate,
    totalChapters: CHAPTERS.length,
    status: "active",
    rewards: REWARDS,
    unlockCadenceDays: 1,
    leaderboardEnabled: true,
    createdBy: "seed",
  });

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const n = i + 1;
    const unlock = new Date(startDate.getTime() + (n - 1) * DAY);
    await Case.create({
      kind: "chapter",
      seasonId: season.id,
      chapterNumber: n,
      chapterType: ch.type,
      title: ch.title,
      description: ch.description,
      storyText: ch.storyText,
      cliffhanger: ch.cliffhanger,
      type: ch.crime,
      difficulty: ch.difficulty,
      status: "active",
      availableDate: ymd(unlock),
      estimatedMinutes: 8,
      maxScore: 1000,
      victim: { ...ch.victim, avatar: "default_victim" },
      suspects: ch.suspects.map((s) => ({ ...s, avatar: "default_suspect" })),
      evidence: ch.evidence.map((e) => ({ isRedHerring: false, ...e })),
      witnessStatements: ch.witnesses,
      timeline: ch.timeline,
      megaOptions: { motives: ch.motives, weapons: [] },
      solution: { ...ch.solution, weapon: "" },
    });
  }

  logger.info(
    `Seeded season "${season.title}" with ${CHAPTERS.length} chapters.`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Season seed failed:", err);
  process.exit(1);
});
