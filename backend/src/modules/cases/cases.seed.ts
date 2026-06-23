import type { ICase } from "./case.model";

const today = new Date();

function dateOffset(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const seedCases: Omit<ICase, keyof Document>[] = [
  // ── Case 1 — Today ───────────────────────────────────────────────────────
  {
    title: "The Missing Merchant",
    description:
      "Ibrahim Al-Rashid, a wealthy spice merchant, vanished the night of March 3rd. His shop was found unlocked, his safe empty. Four people were last seen with him that evening.",
    type: "disappearance",
    difficulty: "easy",
    status: "active",
    availableDate: dateOffset(0),
    estimatedMinutes: 10,
    maxScore: 1000,
    victim: {
      name: "Ibrahim Al-Rashid",
      description: "A wealthy spice merchant, 52 years old.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "suspect_1",
        name: "Hassan Karimi",
        description:
          "Business partner. Recently discovered Ibrahim was dissolving their partnership.",
        alibi: "Claims he was at a dinner party across town.",
        relationship: "Business Partner",
        avatar: "default_suspect",
      },
      {
        id: "suspect_2",
        name: "Leila Al-Rashid",
        description: "Ibrahim's wife. Found out about a secret second family.",
        alibi: "Says she was home alone all evening.",
        relationship: "Wife",
        avatar: "default_suspect",
      },
      {
        id: "suspect_3",
        name: "Karim Nasser",
        description: "Rival merchant who lost a major contract to Ibrahim.",
        alibi: "Claims he was at his shop doing inventory.",
        relationship: "Business Rival",
        avatar: "default_suspect",
      },
      {
        id: "suspect_4",
        name: "Omar Farouk",
        description:
          "Ibrahim's loyal servant, recently fired without explanation.",
        alibi: "Says he was at the market until closing.",
        relationship: "Former Servant",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "evidence_1",
        title: "Empty Safe",
        description: "Only Ibrahim and Hassan knew the combination.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "evidence_2",
        title: "Torn Letter",
        description:
          '"...meet me at the warehouse at 9pm or I will reveal everything..."',
        type: "document",
        isRedHerring: false,
      },
      {
        id: "evidence_3",
        title: "Dinner Receipt",
        description:
          "Hassan's receipt — the restaurant is 5 minutes from Ibrahim's shop, not across town.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "evidence_4",
        title: "Muddy Boots",
        description: "Mud matches the riverside warehouse district.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "evidence_5",
        title: "Love Letter",
        description: "A romantic letter from Leila to a neighbor.",
        type: "document",
        isRedHerring: true,
      },
      {
        id: "evidence_6",
        title: "Market Log",
        description:
          "Omar signed out at 6pm, not at closing time as he claimed.",
        type: "document",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "witness_1",
        witnessName: "Fatima the Neighbor",
        statement:
          "I saw a well-dressed man leaving the shop around 9:15pm with a heavy bag.",
        reliability: "reliable",
      },
      {
        id: "witness_2",
        witnessName: "Yusuf the Street Vendor",
        statement:
          "Two men arguing near the warehouse around 9:30pm. One voice was Ibrahim.",
        reliability: "reliable",
      },
      {
        id: "witness_3",
        witnessName: "Nadia the Waitress",
        statement:
          "Hassan left our restaurant at 8:45pm, not at the end of the night.",
        reliability: "reliable",
      },
      {
        id: "witness_4",
        witnessName: "Karim's Employee",
        statement: "I was with Karim all evening. He never left the shop.",
        reliability: "unreliable",
      },
    ],
    timeline: [
      {
        id: "tl_1",
        time: "6:00 PM",
        description: "Omar signs out of the market early.",
        involvedSuspects: ["suspect_4"],
      },
      {
        id: "tl_2",
        time: "8:30 PM",
        description:
          "Ibrahim locks his shop and heads toward the warehouse district.",
        involvedSuspects: [],
      },
      {
        id: "tl_3",
        time: "8:45 PM",
        description: "Hassan leaves the restaurant.",
        involvedSuspects: ["suspect_1"],
      },
      {
        id: "tl_4",
        time: "9:15 PM",
        description: "Well-dressed man seen leaving the shop with a heavy bag.",
        involvedSuspects: ["suspect_1"],
      },
      {
        id: "tl_5",
        time: "9:30 PM",
        description: "Two men heard arguing near the warehouse.",
        involvedSuspects: ["suspect_1"],
      },
      {
        id: "tl_6",
        time: "10:00 PM",
        description: "Ibrahim's shop found unlocked and empty.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "suspect_1",
      motive: "Prevent dissolution of partnership and steal business funds",
      timelineEventId: "tl_5",
      explanation:
        "Hassan lied about being across town. The receipt and witness place him near the shop. He knew the safe combination and sent the threatening letter.",
    },
  } as any,

  // ── Case 2 — Tomorrow ────────────────────────────────────────────────────
  {
    title: "The Poisoned Banker",
    description:
      "Victor Harlow, a prominent banker, was found dead at his desk after a private dinner with three colleagues. The coroner confirmed poisoning.",
    type: "murder",
    difficulty: "medium",
    status: "active",
    availableDate: dateOffset(1),
    estimatedMinutes: 15,
    maxScore: 1500,
    victim: {
      name: "Victor Harlow",
      description:
        "A prominent banker, 58 years old. Known for ruthless business tactics.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Margaret Holt",
        description:
          "Victor's personal assistant. Recently discovered Victor was embezzling from her pension fund.",
        alibi: "Claims she left before dessert was served.",
        relationship: "Assistant",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Robert Finch",
        description: "Junior banker. Victor had just blocked his promotion.",
        alibi: "Says he was in the bathroom when Victor collapsed.",
        relationship: "Colleague",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Diana Cross",
        description: "Victor's business rival attending as a guest.",
        alibi: "Claims she never touched the wine glasses.",
        relationship: "Business Rival",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Wine Glass",
        description:
          "Traces of arsenic found only in Victor's glass. Only Margaret poured the wine.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Pension Documents",
        description:
          "Documents proving Victor had stolen from Margaret's pension fund over 3 years.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Arsenic Bottle",
        description: "A small bottle found in Margaret's desk drawer.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Robert's Letter",
        description: "An angry resignation letter Robert wrote but never sent.",
        type: "document",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Security Footage",
        description:
          "Shows Margaret alone in the dining room for 3 minutes before dinner.",
        type: "digital",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "The Chef",
        statement:
          "Margaret insisted on pouring the wine herself. She said it was a tradition.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Robert Finch",
        statement:
          "I saw Margaret near the wine table before dinner. I thought nothing of it at the time.",
        reliability: "uncertain",
      },
      {
        id: "w3",
        witnessName: "Diana Cross",
        statement:
          "Victor had mentioned Margaret was acting strangely lately. He seemed worried.",
        reliability: "unreliable",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "7:00 PM",
        description: "Guests arrive for dinner.",
        involvedSuspects: [],
      },
      {
        id: "t2",
        time: "7:15 PM",
        description:
          "Margaret alone in dining room for 3 minutes (security footage).",
        involvedSuspects: ["s1"],
      },
      {
        id: "t3",
        time: "7:30 PM",
        description: "Margaret pours wine for all guests.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t4",
        time: "8:45 PM",
        description: "Victor collapses during dessert.",
        involvedSuspects: [],
      },
      {
        id: "t5",
        time: "9:00 PM",
        description: "Victor pronounced dead. Arsenic poisoning confirmed.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s1",
      motive: "Revenge for years of embezzlement from her pension fund",
      timelineEventId: "t2",
      explanation:
        "Margaret poisoned Victor's wine glass during the 3 minutes she was alone in the dining room. The arsenic bottle in her desk and the pension documents confirm her motive and means.",
    },
  } as any,

  // ── Case 3 — Day +2 ──────────────────────────────────────────────────────
  {
    title: "The Art Gallery Theft",
    description:
      "A priceless painting worth $2 million vanished from the Meridian Gallery overnight. The alarm wasn't triggered. Three people had access.",
    type: "theft",
    difficulty: "easy",
    status: "active",
    availableDate: dateOffset(2),
    estimatedMinutes: 10,
    maxScore: 1000,
    victim: {
      name: "Meridian Gallery",
      description:
        "A prestigious art gallery housing works worth over $50 million.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Pierre Dubois",
        description:
          "Night security guard. Has gambling debts totaling $80,000.",
        alibi: "Claims he was doing rounds all night.",
        relationship: "Security Guard",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Clara Webb",
        description:
          "Gallery curator. Recently fired and escorted out last week.",
        alibi: "Claims her keycard was deactivated after firing.",
        relationship: "Former Curator",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Thomas Reid",
        description: "Art restorer with access to all paintings.",
        alibi: "Claims he left at 6pm and has a receipt from a restaurant.",
        relationship: "Art Restorer",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Disabled Alarm Log",
        description:
          "The alarm was disabled from inside using the guard station terminal at 2:15am.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Gambling Receipts",
        description: "Pierre's recent gambling losses found in his locker.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Cash Deposit",
        description:
          "Pierre made a $10,000 cash deposit the morning after the theft.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Clara's Keycard",
        description:
          "Clara's keycard was indeed deactivated — she couldn't have entered.",
        type: "digital",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Restaurant Receipt",
        description:
          "Thomas's receipt is genuine — confirmed by the restaurant owner.",
        type: "document",
        isRedHerring: true,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Cleaning Staff",
        statement:
          "I saw Pierre near the main gallery at 2am. He told me to leave early and he would finish the rounds.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Bank Teller",
        statement:
          "Pierre came in at 9am with $10,000 in cash. He seemed nervous.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Gallery Owner",
        statement:
          "Clara was furious when she was fired. She threatened to 'make us pay'.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "10:00 PM",
        description: "Gallery closes. Pierre begins his shift.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t2",
        time: "2:00 AM",
        description: "Pierre sends cleaning staff home early.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t3",
        time: "2:15 AM",
        description: "Alarm disabled from guard station.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t4",
        time: "2:20 AM",
        description:
          "Painting removed from wall (estimated from dust pattern).",
        involvedSuspects: ["s1"],
      },
      {
        id: "t5",
        time: "6:00 AM",
        description: "Day staff arrives and discovers theft.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s1",
      motive: "Gambling debts — sold the painting to an anonymous buyer",
      timelineEventId: "t3",
      explanation:
        "Pierre disabled the alarm from his guard station, sent the cleaning staff away, and stole the painting. The $10,000 cash deposit the next morning was an advance payment from the buyer.",
    },
  } as any,

  // ── Case 4 — Day +3 ──────────────────────────────────────────────────────
  {
    title: "The Sabotaged Race",
    description:
      "Star Formula driver Alex Mercer's car brakes failed during qualifying. Mechanics confirmed tampering. Three people had access to the garage that night.",
    type: "sabotage",
    difficulty: "medium",
    status: "active",
    availableDate: dateOffset(3),
    estimatedMinutes: 15,
    maxScore: 1500,
    victim: {
      name: "Alex Mercer",
      description:
        "A Formula racing driver, 29 years old. Championship leader.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Jake Torres",
        description:
          "Alex's teammate. Currently 2nd in championship, 15 points behind Alex.",
        alibi: "Claims he was at the team hotel all night.",
        relationship: "Teammate",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Nina Rossi",
        description:
          "Senior mechanic. Alex had publicly blamed her for a pit stop error last race.",
        alibi: "Claims she left the garage at 8pm.",
        relationship: "Mechanic",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Frank Deller",
        description: "Rival team's engineer caught near the garage.",
        alibi: "Claims he was just passing by.",
        relationship: "Rival Engineer",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Brake Line Cut",
        description:
          "Cut was precise and surgical — done by someone with mechanical expertise.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Garage Access Log",
        description:
          "Nina badged into the garage at 11:30pm — 3.5 hours after she claims to have left.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Championship Contract",
        description:
          "Jake's contract includes a $5M bonus if he wins the championship.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Hotel Keycard Log",
        description: "Jake's keycard was used at the hotel at 11pm and 1am.",
        type: "digital",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Nina's Tool Set",
        description:
          "A precision cutter matching the brake line cut found in Nina's toolbox.",
        type: "physical",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Security Camera Op",
        statement:
          "The camera near Bay 3 was manually rotated away at 11:25pm. Only mechanics know how to do that.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Janitor",
        statement:
          "I saw a woman in team uniform near Alex's car around midnight. She had a tool bag.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Jake Torres",
        statement:
          "Nina was furious after Alex blamed her publicly. She said she'd make him regret it.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "8:00 PM",
        description: "Nina officially badges out of the garage.",
        involvedSuspects: ["s2"],
      },
      {
        id: "t2",
        time: "11:25 PM",
        description: "Security camera near Bay 3 manually rotated.",
        involvedSuspects: ["s2"],
      },
      {
        id: "t3",
        time: "11:30 PM",
        description: "Nina's badge used to re-enter garage.",
        involvedSuspects: ["s2"],
      },
      {
        id: "t4",
        time: "12:00 AM",
        description: "Woman in team uniform seen near Alex's car.",
        involvedSuspects: ["s2"],
      },
      {
        id: "t5",
        time: "10:00 AM",
        description: "Alex's brakes fail during qualifying lap.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s2",
      motive: "Revenge after Alex publicly blamed her for the pit stop error",
      timelineEventId: "t3",
      explanation:
        "Nina returned to the garage at 11:30pm after officially leaving. She rotated the security camera, used her mechanical expertise to cut the brake line precisely, and was seen by the janitor. Jake's hotel alibi checks out.",
    },
  } as any,

  // ── Case 5 — Day +4 ──────────────────────────────────────────────────────
  {
    title: "The Corporate Fraud",
    description:
      "$3 million disappeared from Nexus Corp's accounts over six months. The CFO is dead from an apparent suicide. But the detective thinks otherwise.",
    type: "fraud",
    difficulty: "hard",
    status: "active",
    availableDate: dateOffset(4),
    estimatedMinutes: 20,
    maxScore: 2000,
    victim: {
      name: "Nexus Corporation",
      description: "A mid-size tech company with 500 employees.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Sandra Cole",
        description: "CEO. Recently purchased a $1.2M beach house in cash.",
        alibi: "Claims she had no knowledge of the transfers.",
        relationship: "CEO",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Marcus Webb",
        description:
          "Head of IT. Created the internal transfer system used in the fraud.",
        alibi: "Claims the system was hacked by an outsider.",
        relationship: "IT Director",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Phillip Grant",
        description:
          "Dead CFO. Left a suicide note confessing to the fraud alone.",
        alibi: "Deceased.",
        relationship: "CFO (deceased)",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Transfer Logs",
        description:
          "All transfers required dual authorization — CFO + CEO signatures.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Beach House Deed",
        description:
          "Sandra's $1.2M beach house purchased 2 weeks after the largest transfer.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Suicide Note Analysis",
        description:
          "Handwriting experts confirmed the note was written under duress — likely dictated.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Hacking Report",
        description:
          "Marcus's 'hack' report has no external IP traces — it was an inside job.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e5",
        title: "Philip's Emails",
        description:
          'Philip emailed his lawyer 3 days before death: "I know what Sandra did. I have proof."',
        type: "digital",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Philip's Lawyer",
        statement:
          "Philip told me he had discovered Sandra was forcing him to co-sign fraudulent transfers. He was scared.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Office Cleaner",
        statement:
          "I heard Sandra and Philip arguing loudly the night before he died. Sandra said 'you'll take the fall for this'.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Marcus Webb",
        statement:
          "Sandra asked me to make the transfers look like external hacks. I thought it was a security test.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "6 months ago",
        description:
          "First fraudulent transfer — $500K. Both Sandra and Philip signatures used.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t2",
        time: "2 weeks ago",
        description: "Sandra purchases beach house with cash.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t3",
        time: "3 days ago",
        description: "Philip emails his lawyer about Sandra.",
        involvedSuspects: ["s3"],
      },
      {
        id: "t4",
        time: "2 days ago",
        description: "Sandra and Philip argue in the office.",
        involvedSuspects: ["s1", "s3"],
      },
      {
        id: "t5",
        time: "Yesterday",
        description: "Philip found dead. Suicide note present.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s1",
      motive:
        "Personal enrichment — stole $3M and killed Philip to prevent exposure",
      timelineEventId: "t4",
      explanation:
        "Sandra orchestrated the fraud using her CEO authorization alongside Philip's forced co-signatures. When Philip threatened to expose her, she murdered him and staged it as a suicide, forcing him to write the note under duress.",
    },
  } as any,

  // ── Case 6 — Day +5 ──────────────────────────────────────────────────────
  {
    title: "The Vanishing Professor",
    description:
      "Professor Elena Voss disappeared from her university office after receiving a threatening letter. Her research into pharmaceutical corruption may hold the key.",
    type: "disappearance",
    difficulty: "hard",
    status: "active",
    availableDate: dateOffset(5),
    estimatedMinutes: 20,
    maxScore: 2000,
    victim: {
      name: "Professor Elena Voss",
      description:
        "A renowned pharmacology professor, 47 years old. About to publish explosive research.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Dr. Alan Price",
        description:
          "Elena's research partner. Set to lose his reputation if her findings are published.",
        alibi: "Claims he was at a conference in another city.",
        relationship: "Research Partner",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "James Corbin",
        description: "CEO of PharmaCorp, the company Elena was investigating.",
        alibi: "Claims he has never met Elena personally.",
        relationship: "Pharma CEO",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Rachel Moss",
        description: "Elena's graduate student and research assistant.",
        alibi: "Claims Elena left the office normally on Friday afternoon.",
        relationship: "Graduate Student",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Threatening Letter",
        description:
          '"Stop the research or disappear permanently." No fingerprints — printed from a university printer.',
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Conference Records",
        description:
          "Alan's conference registration exists but he never checked into the hotel.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "PharmaCorp Payment",
        description:
          "A $50,000 transfer from PharmaCorp to Alan's private account found.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Rachel's Notes",
        description:
          "Rachel's research notes show she had been copying Elena's findings for months.",
        type: "document",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "CCTV Footage",
        description:
          "Alan's car parked near the university on the day he claimed to be at the conference.",
        type: "digital",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "University Security",
        statement:
          "Alan badged into the building at 4pm on Friday — the same time Elena disappeared.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Taxi Driver",
        statement:
          "I drove a man matching Alan's description to a remote storage facility Friday evening.",
        reliability: "uncertain",
      },
      {
        id: "w3",
        witnessName: "PharmaCorp Whistleblower",
        statement:
          "James Corbin paid someone inside the university to stop the research. I saw the wire transfer.",
        reliability: "reliable",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "Monday",
        description: "Elena receives threatening letter.",
        involvedSuspects: [],
      },
      {
        id: "t2",
        time: "Friday 9am",
        description:
          "Alan's conference supposedly starts — he never checks in.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t3",
        time: "Friday 4pm",
        description: "Alan badges into university building.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t4",
        time: "Friday 4:30pm",
        description: "Elena last seen by Rachel leaving her office.",
        involvedSuspects: [],
      },
      {
        id: "t5",
        time: "Friday 6pm",
        description: "Alan's car seen near storage facility.",
        involvedSuspects: ["s1"],
      },
    ],
    solution: {
      suspectId: "s1",
      motive:
        "Paid by PharmaCorp to stop the research and protect his own reputation",
      timelineEventId: "t3",
      explanation:
        "Alan was paid $50,000 by PharmaCorp to stop Elena's research. He faked his conference attendance, returned to the university, and abducted Elena. The CCTV and badge records prove he was there despite his alibi.",
    },
  } as any,

  // ── Case 7 — Day +6 ──────────────────────────────────────────────────────
  {
    title: "The Stolen Election",
    description:
      "Votes were manipulated in the Westbrook city council election. The winner won by just 47 votes. A whistleblower came forward with evidence of fraud.",
    type: "fraud",
    difficulty: "expert",
    status: "active",
    availableDate: dateOffset(6),
    estimatedMinutes: 25,
    maxScore: 3000,
    victim: {
      name: "Westbrook Election Commission",
      description: "The democratic process of Westbrook city.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Mayor Douglas Hale",
        description:
          "Won the election by 47 votes. Stands to lose his position if fraud is proven.",
        alibi: "Claims the election was completely fair.",
        relationship: "Winner",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Patricia Stone",
        description:
          "Chief Election Officer. Has worked with Douglas for 15 years.",
        alibi: "Claims all procedures were followed correctly.",
        relationship: "Election Officer",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Carl Briggs",
        description:
          "IT contractor who managed the voting software. Recently received a large anonymous payment.",
        alibi: "Claims the software was unmodified.",
        relationship: "IT Contractor",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Voting Software Code",
        description:
          "A hidden function found that added 0.5% to Douglas's count and subtracted from opponent.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Anonymous Payment",
        description:
          "$75,000 transferred to Carl's account 2 weeks before the election.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Payment Origin",
        description:
          "The $75,000 traces back to a shell company linked to Douglas's campaign fund.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Patricia's Emails",
        description:
          "Patricia emailed Douglas: 'Everything is set. Carl confirmed the modification.'",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e5",
        title: "Ballot Paper Count",
        description:
          "Physical ballot count matches the fraudulent digital count — Carl backdated the paper trail.",
        type: "document",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Whistleblower (Anonymous)",
        statement:
          "I worked with Carl. He showed me the code modification and said 'the mayor always wins'.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Campaign Finance Auditor",
        statement:
          "The shell company used to pay Carl was created by Douglas's campaign lawyer.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Patricia Stone",
        statement:
          "I only followed Douglas's instructions. I didn't know it was illegal.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "3 weeks before",
        description:
          "Carl hired as IT contractor by Patricia on Douglas's recommendation.",
        involvedSuspects: ["s1", "s2", "s3"],
      },
      {
        id: "t2",
        time: "2 weeks before",
        description: "$75,000 transferred to Carl.",
        involvedSuspects: ["s1", "s3"],
      },
      {
        id: "t3",
        time: "1 week before",
        description: "Voting software modified with hidden function.",
        involvedSuspects: ["s3"],
      },
      {
        id: "t4",
        time: "Election day",
        description: "Douglas wins by 47 votes.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t5",
        time: "Next day",
        description: "Whistleblower contacts investigators.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s1",
      motive: "Win the election at any cost to maintain political power",
      timelineEventId: "t2",
      explanation:
        "Douglas orchestrated the entire fraud — hiring Carl through Patricia, funding the modification through a shell company, and coordinating via email with Patricia. The payment trail and email evidence directly link him as the mastermind.",
    },
  } as any,
  // ── Case 8 — Yesterday ───────────────────────────────────────────────────
  {
    title: "The Midnight Fire",
    description:
      "A warehouse burned down at midnight. The owner claims insurance fraud. Three workers had access that night.",
    type: "sabotage",
    difficulty: "easy",
    status: "active",
    availableDate: dateOffset(-1),
    estimatedMinutes: 10,
    maxScore: 1000,
    victim: {
      name: "Harlow Warehouse Co.",
      description: "A storage warehouse worth $500,000.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Danny Harlow",
        description: "Owner. Recently took out a $600,000 insurance policy.",
        alibi: "Claims he was at home asleep.",
        relationship: "Owner",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Pete Walsh",
        description: "Night guard. Was fired the next morning.",
        alibi: "Claims he saw nothing unusual.",
        relationship: "Night Guard",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Rosa Diaz",
        description:
          "Bookkeeper. Discovered accounting irregularities last week.",
        alibi: "Claims she left at 6pm.",
        relationship: "Bookkeeper",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Accelerant Traces",
        description:
          "Gasoline traces found at 3 separate ignition points — clearly intentional.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Insurance Policy",
        description:
          "Danny doubled the insurance value 2 weeks before the fire.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Phone Records",
        description:
          "Danny called Pete at 11:45pm — 15 minutes before the fire started.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Rosa's Report",
        description:
          "Rosa's accounting report showed Danny had been embezzling from the company.",
        type: "document",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Gas Can",
        description:
          "An empty gas can found in Pete's locker with Danny's fingerprints on it.",
        type: "physical",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Neighbor",
        statement:
          "I saw a car matching Danny's parked near the warehouse at midnight.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Pete Walsh",
        statement:
          "Danny called me and told me to take the night off early. I thought nothing of it.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Insurance Agent",
        statement:
          "Danny seemed very eager to confirm the policy details just days before the fire.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "11:45 PM",
        description: "Danny calls Pete, tells him to leave early.",
        involvedSuspects: ["s1", "s2"],
      },
      {
        id: "t2",
        time: "12:00 AM",
        description: "Fire starts at 3 separate points simultaneously.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t3",
        time: "12:05 AM",
        description: "Fire department called by neighbor.",
        involvedSuspects: [],
      },
      {
        id: "t4",
        time: "12:30 AM",
        description: "Warehouse destroyed. Danny arrives on scene.",
        involvedSuspects: ["s1"],
      },
    ],
    solution: {
      suspectId: "s1",
      motive: "Insurance fraud to cover embezzlement losses",
      timelineEventId: "t1",
      explanation:
        "Danny orchestrated the arson to collect insurance money and cover his embezzlement. He called Pete to clear the building, then set the fire himself at 3 points. His fingerprints on the gas can sealed the case.",
    },
  } as any,

  // ── Case 9 — 2 days ago ───────────────────────────────────────────────────
  {
    title: "The Stolen Diamond",
    description:
      "The famous Blue Star diamond vanished from a private auction. Only 4 bidders and the auctioneer were present when it disappeared.",
    type: "theft",
    difficulty: "medium",
    status: "active",
    availableDate: dateOffset(-2),
    estimatedMinutes: 15,
    maxScore: 1500,
    victim: {
      name: "Prestige Auction House",
      description: "An exclusive auction house handling rare gems.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Lord Ashworth",
        description:
          "British aristocrat. Lost a fortune in bad investments recently.",
        alibi: "Claims he never left his seat.",
        relationship: "Bidder",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Mei Lin",
        description:
          "Art dealer. Known to have connections with underground gem traders.",
        alibi: "Claims she was on a phone call during the theft.",
        relationship: "Bidder",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Gerald Fox",
        description:
          "Auctioneer. Has worked here 20 years but recently learned he's being replaced.",
        alibi: "Claims he was managing the presentation.",
        relationship: "Auctioneer",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Power Outage Log",
        description:
          "Power went out for exactly 8 seconds — triggered manually from the fuse box.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Fuse Box Access",
        description: "Only Gerald had the key to the fuse box room.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Hidden Compartment",
        description:
          "A hidden compartment found in the display podium — only Gerald knew it existed.",
        type: "physical",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Mei Lin's Phone",
        description:
          "Mei's call log confirms she was indeed on a call during the blackout.",
        type: "digital",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Severance Letter",
        description:
          "Gerald received his termination letter the morning of the auction.",
        type: "document",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Security Guard",
        statement:
          "I saw Gerald near the fuse box 10 minutes before the blackout. I assumed he was doing maintenance.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Lord Ashworth",
        statement:
          "During the blackout I heard a faint click near the podium — like a compartment opening.",
        reliability: "uncertain",
      },
      {
        id: "w3",
        witnessName: "Cleaning Staff",
        statement:
          "I found a velvet pouch behind Gerald's desk after the auction. It smelled like the display case.",
        reliability: "reliable",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "2:00 PM",
        description: "Gerald receives termination letter.",
        involvedSuspects: ["s3"],
      },
      {
        id: "t2",
        time: "6:50 PM",
        description: "Gerald seen near fuse box.",
        involvedSuspects: ["s3"],
      },
      {
        id: "t3",
        time: "7:00 PM",
        description: "Auction begins. Diamond displayed.",
        involvedSuspects: [],
      },
      {
        id: "t4",
        time: "7:23 PM",
        description: "8-second blackout. Diamond disappears.",
        involvedSuspects: ["s3"],
      },
      {
        id: "t5",
        time: "7:24 PM",
        description: "Lights return. Diamond gone.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s3",
      motive: "Revenge for termination after 20 years of service",
      timelineEventId: "t4",
      explanation:
        "Gerald triggered the blackout using his fuse box key, then used his knowledge of the hidden podium compartment to pocket the diamond in 8 seconds of darkness. His termination letter gave him motive.",
    },
  } as any,

  // ── Case 10 — 3 days ago ─────────────────────────────────────────────────
  {
    title: "The Forged Will",
    description:
      "Billionaire Edward Crane died leaving his entire fortune to his nurse. His family claims the will is forged. A handwriting expert agrees.",
    type: "fraud",
    difficulty: "hard",
    status: "active",
    availableDate: dateOffset(-3),
    estimatedMinutes: 20,
    maxScore: 2000,
    victim: {
      name: "Crane Family Estate",
      description: "A $50 million estate left in dispute.",
      avatar: "default_victim",
    },
    suspects: [
      {
        id: "s1",
        name: "Nurse Clara Benn",
        description:
          "Edward's private nurse for 2 years. Sole beneficiary of the disputed will.",
        alibi: "Claims Edward changed his will voluntarily.",
        relationship: "Nurse",
        avatar: "default_suspect",
      },
      {
        id: "s2",
        name: "Thomas Crane",
        description:
          "Edward's son. Previously the sole heir. Has significant gambling debts.",
        alibi: "Claims he was in London when the will was changed.",
        relationship: "Son",
        avatar: "default_suspect",
      },
      {
        id: "s3",
        name: "Attorney Voss",
        description:
          "The lawyer who notarized the new will. Has worked with Clara before.",
        alibi: "Claims the signing was completely legitimate.",
        relationship: "Attorney",
        avatar: "default_suspect",
      },
    ],
    evidence: [
      {
        id: "e1",
        title: "Handwriting Analysis",
        description:
          "Expert confirms Edward's signature was traced — pressure patterns inconsistent with natural signing.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e2",
        title: "Medical Records",
        description:
          "Edward had severe tremors in his final weeks — physically incapable of signing documents.",
        type: "document",
        isRedHerring: false,
      },
      {
        id: "e3",
        title: "Bank Transfer",
        description:
          "Clara transferred $200,000 to Attorney Voss 3 days before the will was notarized.",
        type: "digital",
        isRedHerring: false,
      },
      {
        id: "e4",
        title: "Thomas's Debts",
        description:
          "Thomas owes $800,000 to creditors — but has no connection to the forgery.",
        type: "document",
        isRedHerring: true,
      },
      {
        id: "e5",
        title: "Security Footage",
        description:
          "Clara and Voss met privately in a café 1 week before Edward's death — not the first time.",
        type: "digital",
        isRedHerring: false,
      },
    ],
    witnessStatements: [
      {
        id: "w1",
        witnessName: "Edward's Doctor",
        statement:
          "Edward was not lucid in his final days. He could not have understood or signed legal documents.",
        reliability: "reliable",
      },
      {
        id: "w2",
        witnessName: "Housekeeper",
        statement:
          "Clara asked me to leave the room on the day the will was supposedly signed. I thought it was odd.",
        reliability: "reliable",
      },
      {
        id: "w3",
        witnessName: "Thomas Crane",
        statement:
          "Father told me last year he would never change his will. Clara must have manipulated him.",
        reliability: "uncertain",
      },
    ],
    timeline: [
      {
        id: "t1",
        time: "2 weeks before death",
        description: "Clara and Voss meet privately.",
        involvedSuspects: ["s1", "s3"],
      },
      {
        id: "t2",
        time: "1 week before death",
        description: "$200,000 transferred from Clara to Voss.",
        involvedSuspects: ["s1", "s3"],
      },
      {
        id: "t3",
        time: "3 days before death",
        description: "Will supposedly signed — housekeeper sent away.",
        involvedSuspects: ["s1"],
      },
      {
        id: "t4",
        time: "Day of death",
        description: "Edward dies. Clara immediately contacts Voss.",
        involvedSuspects: ["s1", "s3"],
      },
      {
        id: "t5",
        time: "Next day",
        description:
          "Will presented to family. Thomas contests it immediately.",
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: "s1",
      motive: "Steal $50M inheritance by forging will with complicit attorney",
      timelineEventId: "t2",
      explanation:
        "Clara paid Voss $200,000 to notarize a forged will while Edward was incapacitated. The handwriting analysis, medical records, and payment trail prove the conspiracy. Thomas's debts are a red herring.",
    },
  } as any,
];
