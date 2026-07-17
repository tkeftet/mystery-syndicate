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
 * TRILINGUAL BY CONSTRUCTION: every displayed text field is authored in the
 * three app languages and stored directly as a { en, fr, ar } object — no
 * translation step, no API key, nothing to resolve at seed time. The API serves
 * the right language per request (see shared/localized.ts). Answer-bearing
 * option strings (megaOptions + solution.motive/weapon) are localized too; the
 * solution always references the SAME object as its option, so mega/chapter
 * scoring (which resolves the solution to the caller's language) matches the
 * displayed chip exactly.
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

// ── Trilingual text helpers ──────────────────────────────────────────────────
// L is the stored shape of every localizable field: all three languages inline.
type LangKey = "en" | "fr" | "ar";
interface L { en: string; fr: string; ar: string }
const tl = (en: string, fr: string, ar: string): L => ({ en, fr, ar });
/** Build an L by producing each language variant (for template glue). */
const make = (f: (l: LangKey) => string): L => ({ en: f("en"), fr: f("fr"), ar: f("ar") });
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lcf = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

// ── Name rotation (fr keeps Latin spelling; ar is a transliteration) ────────
const N = (latin: string, ar: string): L => ({ en: latin, fr: latin, ar });
const NAMES: L[] = [
  N("Alden", "ألدن"), N("Bianca", "بيانكا"), N("Cyrus", "سايروس"), N("Delia", "ديليا"),
  N("Elias", "إلياس"), N("Farah", "فرح"), N("Gideon", "غيديون"), N("Hana", "هانا"),
  N("Ivo", "إيفو"), N("Juno", "جونو"), N("Kaleb", "كالب"), N("Lena", "لينا"),
  N("Milo", "مايلو"), N("Nadia", "نادية"), N("Osric", "أوسريك"), N("Petra", "بيترا"),
  N("Quinn", "كوين"), N("Rhea", "ريا"), N("Soren", "سورين"), N("Talia", "تاليا"),
  N("Ugo", "أوغو"), N("Vera", "فيرا"), N("Wes", "ويس"), N("Xenia", "زينيا"),
  N("Yannis", "يانيس"), N("Zara", "زارا"), N("Anselm", "أنسيلم"), N("Briar", "براير"),
  N("Corin", "كورين"), N("Dax", "داكس"), N("Esme", "إسمي"), N("Fox", "فوكس"),
  N("Greer", "غرير"), N("Hollis", "هوليس"), N("Iris", "آيريس"), N("Joss", "جوس"),
  N("Karim", "كريم"), N("Liv", "ليف"), N("Marek", "ماريك"), N("Noor", "نور"),
  N("Orin", "أورين"), N("Pia", "بيا"), N("Reeve", "ريف"), N("Suri", "سوري"),
  N("Tomas", "توماس"), N("Ula", "أولا"), N("Viggo", "فيغو"), N("Wren", "رين"),
];
const nameAt = (seed: number): L => NAMES[((seed % NAMES.length) + NAMES.length) % NAMES.length];

// Per-crime title template ({v} = victim name) and "what happened" verb phrase.
const TITLE_TPL: Record<Crime, L> = {
  murder: tl("The Murder of {v}", "Le meurtre de {v}", "مقتل {v}"),
  theft: tl("The Robbery of {v}", "Le vol commis contre {v}", "سرقة {v}"),
  disappearance: tl("The Disappearance of {v}", "La disparition de {v}", "اختفاء {v}"),
  sabotage: tl("The Sabotage Against {v}", "Le sabotage visant {v}", "تخريب يستهدف {v}"),
  fraud: tl("The Fraud Against {v}", "L'escroquerie visant {v}", "احتيال يستهدف {v}"),
};
const CRIME_VERB: Record<Crime, L> = {
  murder: tl("was murdered", "a été assassiné", "قُتل"),
  theft: tl("was robbed", "a été dévalisé", "تعرّض للسرقة"),
  disappearance: tl("vanished", "a disparu", "اختفى"),
  sabotage: tl("was sabotaged", "a été saboté", "تعرّض للتخريب"),
  fraud: tl("was defrauded", "a été escroqué", "وقع ضحية احتيال"),
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY / standalone case factory
// ─────────────────────────────────────────────────────────────────────────────
interface Role { role: L; alibi: L; rel: L }
const R = (role: L, alibi: L, rel: L): Role => ({ role, alibi, rel });

interface DailyPack {
  place: L;       // WITH preposition: "at the Meridian art gallery" / "à la galerie…" / "في معرض…"
  crime: Crime;
  victimRole: L;  // "the gallery owner"
  suspects: [Role, Role, Role, Role];
  culprit: 0 | 1 | 2 | 3;
  herring: 0 | 1 | 2 | 3; // an innocent the red herring points to
  motive: L;
  means: L;       // weapon / method, with article: "a duplicate vault key"
  keyTime: L;
  clue: L;        // the damning trace, with article: "the vault keypad log"
  witnessLine: L; // reliable statement implicating the culprit ({c} = culprit name)
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
  const culpritId = `suspect_${pack.culprit + 1}`;
  const cName = sNames[pack.culprit];
  const hName = sNames[pack.herring];
  const p = pack;

  const evidence: any[] = [
    {
      id: "ev_1",
      title: make((l) => cap(p.clue[l])),
      description: make((l) =>
        l === "fr" ? `${cap(p.clue.fr)} situe quelqu'un ${p.place.fr} à ${p.keyTime.fr} — au moment même des faits.`
        : l === "ar" ? `${p.clue.ar} يضع أحدهم ${p.place.ar} قرابة ${p.keyTime.ar} — في وقت الجريمة تقريبًا.`
        : `${cap(p.clue.en)} places someone ${p.place.en} at ${p.keyTime.en} — right around the crime.`),
      type: "digital" as const,
      isRedHerring: false,
    },
    {
      id: "ev_2",
      title: make((l) =>
        l === "fr" ? `Des traces laissées par ${p.means.fr}`
        : l === "ar" ? `آثار ${p.means.ar}`
        : `Traces of ${p.means.en}`),
      description: make((l) =>
        l === "fr" ? `La police scientifique relie ${p.means.fr} à la personne qui a agi à ${p.keyTime.fr}.`
        : l === "ar" ? `يربط خبراء الأدلة الجنائية ${p.means.ar} بمن تحرّك قرابة ${p.keyTime.ar}.`
        : `Forensics tie ${p.means.en} to whoever acted at ${p.keyTime.en}.`),
      type: "physical" as const,
      isRedHerring: false,
    },
    {
      id: "ev_3",
      title: tl("A Convenient Grudge", "Une rancune bien commode", "ضغينة مريبة التوقيت"),
      description: make((l) =>
        l === "fr" ? `${hName.fr} s'était disputé publiquement avec la victime — un suspect évident… et trompeur.`
        : l === "ar" ? `${hName.ar} كان على خلاف علني مع الضحية — مشتبه به واضح، لكنه مضلِّل.`
        : `${hName.en} openly clashed with the victim — an obvious, and misleading, suspect.`),
      type: "testimonial" as const,
      isRedHerring: true,
    },
  ];
  if (difficulty === "hard" || difficulty === "expert") {
    evidence.push({
      id: "ev_4",
      title: tl("A Planted Distraction", "Une diversion trop parfaite", "تمويه مدسوس"),
      description: make((l) =>
        l === "fr" ? `Un objet appartenant à ${hName.fr} a été retrouvé sur les lieux — trop bien placé pour être crédible.`
        : l === "ar" ? `عُثر في مسرح الجريمة على غرض يخص ${hName.ar} — وُضع بعناية تفضح أنه مدسوس.`
        : `An item belonging to ${hName.en} was left at the scene — too neatly to be real.`),
      type: "physical" as const,
      isRedHerring: true,
    });
  }

  return {
    kind: "daily" as const,
    title: make((l) => TITLE_TPL[p.crime][l].replace("{v}", victimName[l])),
    description: make((l) =>
      l === "fr" ? `${cap(p.victimRole.fr)}, ${victimName.fr}, ${CRIME_VERB[p.crime].fr} ${p.place.fr}. Quatre personnes avaient un mobile et l'occasion d'agir.`
      : l === "ar" ? `${p.victimRole.ar} ${victimName.ar} ${CRIME_VERB[p.crime].ar} ${p.place.ar}. أربعة أشخاص كانت لديهم الدوافع والفرصة.`
      : `${cap(p.victimRole.en)}, ${victimName.en}, ${CRIME_VERB[p.crime].en} ${p.place.en}. Four people had reason and opportunity.`),
    type: p.crime,
    difficulty,
    status: "active" as const,
    availableDate,
    estimatedMinutes: DIFF[difficulty].estimatedMinutes,
    maxScore: DIFF[difficulty].maxScore,
    victim: {
      name: victimName,
      description: make((l) => `${cap(p.victimRole[l])}.`),
      avatar: "default_victim",
    },
    suspects: p.suspects.map((r, i) => ({
      id: `suspect_${i + 1}`,
      name: sNames[i],
      description: make((l) => `${sNames[i][l]} — ${r.role[l]}.`),
      alibi: r.alibi,
      relationship: r.rel,
      avatar: "default_suspect",
    })),
    evidence,
    witnessStatements: [
      {
        id: "w_1",
        witnessName,
        statement: make((l) => p.witnessLine[l].replace(/\{c\}/g, cName[l])),
        reliability: "reliable" as const,
      },
      {
        id: "w_2",
        witnessName: nameAt(base + 4),
        statement: make((l) =>
          l === "fr" ? `${hName.fr} était furieux et bruyant, mais n'était pas sur place à ${p.keyTime.fr}.`
          : l === "ar" ? `${hName.ar} كان غاضبًا وصاخبًا، لكنه لم يكن موجودًا هناك قرابة ${p.keyTime.ar}.`
          : `${hName.en} was loud and angry, but was never actually there at ${p.keyTime.en}.`),
        reliability: "uncertain" as const,
      },
    ],
    timeline: [
      {
        id: "t_1",
        time: tl("Earlier", "Plus tôt", "قبل ذلك"),
        description: make((l) =>
          l === "fr" ? `Les lieux se vident ${p.place.fr} ; la victime se retrouve seule.`
          : l === "ar" ? `يخلو المكان ${p.place.ar}؛ وتبقى الضحية دون حماية.`
          : `The scene empties out ${p.place.en}; the victim is left exposed.`),
        involvedSuspects: [],
      },
      {
        id: "t_2",
        time: p.keyTime,
        description: make((l) =>
          l === "fr" ? `${cName.fr} est repéré ${p.place.fr} — ce que confirme ${p.clue.fr}.`
          : l === "ar" ? `يتأكد وجود ${cName.ar} ${p.place.ar} — بما يطابق ${p.clue.ar}.`
          : `${cName.en} is placed ${p.place.en} — matching ${p.clue.en}.`),
        involvedSuspects: [culpritId],
      },
      {
        id: "t_3",
        time: tl("Discovery", "La découverte", "الاكتشاف"),
        description: make((l) =>
          l === "fr" ? `Le crime est découvert ; ${p.means.fr} a disparu ou a servi.`
          : l === "ar" ? `تُكتشف الجريمة؛ وتشير الدلائل إلى استخدام ${p.means.ar}.`
          : `The crime is discovered; ${p.means.en} is missing or was used.`),
        involvedSuspects: [],
      },
    ],
    solution: {
      suspectId: culpritId,
      motive: p.motive,
      weapon: p.means,
      timelineEventId: "t_2",
      explanation: make((l) =>
        l === "fr" ? `${cap(p.clue.fr)} place ${cName.fr} ${p.place.fr} à ${p.keyTime.fr}, et ${p.means.fr} complète le tableau. Mobile : ${p.motive.fr}. Les indices visant ${hName.fr} n'étaient qu'une diversion délibérée.`
        : l === "ar" ? `${p.clue.ar} يثبت وجود ${cName.ar} ${p.place.ar} قرابة ${p.keyTime.ar}، و${p.means.ar} تكمل الصورة. الدافع: ${p.motive.ar}. أما الأدلة الموجهة نحو ${hName.ar} فكانت تضليلًا متعمدًا.`
        : `${cName.en} was placed ${p.place.en} at ${p.keyTime.en} by ${p.clue.en} and tied to ${p.means.en}. Motive: ${p.motive.en}. The trail pointing at ${hName.en} was deliberate misdirection.`),
    },
  };
}

const DAILY_PACKS: DailyPack[] = [
  {
    place: tl("at the Meridian art gallery", "à la galerie d'art Meridian", "في معرض ميريديان للفنون"),
    crime: "theft",
    victimRole: tl("the gallery owner", "le propriétaire de la galerie", "مالك المعرض"),
    suspects: [
      R(tl("the night curator", "le conservateur de nuit", "أمين المعرض الليلي"), tl("says they were cataloguing upstairs", "affirme avoir été à l'étage à cataloguer les œuvres", "يقول إنه كان في الطابق العلوي يفهرس الأعمال"), tl("handles the vault code", "détient le code du coffre", "يتولى رمز الخزنة")),
      R(tl("a rival collector", "un collectionneur rival", "جامع تحف منافس"), tl("claims to have left at closing", "prétend être parti à la fermeture", "يدّعي أنه غادر عند الإغلاق"), tl("was outbid last month", "a perdu une enchère le mois dernier", "خسر مزادًا الشهر الماضي")),
      R(tl("the security guard", "l'agent de sécurité", "حارس الأمن"), tl("was on patrol", "était en ronde", "كان في جولة حراسة"), tl("recently passed over for a raise", "s'est vu refuser une augmentation récemment", "حُرم مؤخرًا من علاوة")),
      R(tl("an insurance assessor", "un expert en assurance", "خبير تأمين"), tl("says they were off-site", "affirme avoir été à l'extérieur", "يقول إنه كان خارج الموقع"), tl("valued the stolen piece", "a expertisé l'œuvre volée", "قدّر قيمة القطعة المسروقة")),
    ],
    culprit: 0, herring: 1,
    motive: tl("quiet cash from a private buyer", "de l'argent discret venu d'un acheteur privé", "مال سري من مشترٍ خاص"),
    means: tl("a duplicate vault key", "un double de la clé du coffre", "نسخة مطابقة لمفتاح الخزنة"),
    keyTime: tl("11:40 PM", "23 h 40", "11:40 مساءً"),
    clue: tl("the vault keypad log", "le journal du clavier du coffre", "سجل لوحة أزرار الخزنة"),
    witnessLine: tl("{c} lingered by the vault long after closing.", "{c} s'attardait près du coffre bien après la fermeture.", "بقي {c} قرب الخزنة طويلًا بعد الإغلاق."),
  },
  {
    place: tl("at the Harborview marina", "à la marina de Harborview", "في مرسى هاربورفيو"),
    crime: "murder",
    victimRole: tl("the yacht broker", "le courtier en yachts", "سمسار اليخوت"),
    suspects: [
      R(tl("a jilted business partner", "un associé évincé", "شريك تجاري مُقصى"), tl("claims to have sailed out early", "prétend avoir pris la mer tôt", "يدّعي أنه أبحر باكرًا"), tl("was frozen out of the company", "a été écarté de la société", "أُبعد من الشركة")),
      R(tl("the dockmaster", "le capitaine du port", "مدير المرفأ"), tl("was logging arrivals", "enregistrait les arrivées", "كان يسجّل الوافدين"), tl("owed the victim a fortune", "devait une fortune à la victime", "كان مدينًا للضحية بثروة")),
      R(tl("the victim's ex", "l'ex de la victime", "شريك الضحية السابق"), tl("says they were at a restaurant", "affirme avoir été au restaurant", "يقول إنه كان في مطعم"), tl("lost everything in the split", "a tout perdu dans la séparation", "خسر كل شيء بعد الانفصال")),
      R(tl("a deckhand", "un matelot", "بحّار على متن اليخت"), tl("was scrubbing the hull", "récurait la coque", "كان ينظف هيكل اليخت"), tl("was about to be fired", "était sur le point d'être renvoyé", "كان على وشك الطرد")),
    ],
    culprit: 1, herring: 2,
    motive: tl("erasing an unpayable debt", "effacer une dette impossible à rembourser", "محو دين يستحيل سداده"),
    means: tl("a mooring line", "une amarre", "حبل إرساء"),
    keyTime: tl("9:15 PM", "21 h 15", "9:15 مساءً"),
    clue: tl("the dock CCTV timestamp", "l'horodatage des caméras du quai", "طابع الوقت في كاميرات الرصيف"),
    witnessLine: tl("{c} slipped onto the victim's berth after the lights went out.", "{c} s'est glissé vers l'emplacement de la victime après l'extinction des lumières.", "تسلل {c} إلى مرسى الضحية بعد انطفاء الأضواء."),
  },
  {
    place: tl("at the Ashford tech campus", "sur le campus technologique d'Ashford", "في مجمّع أشفورد التقني"),
    crime: "sabotage",
    victimRole: tl("the lead engineer's demo build", "la version de démonstration de l'ingénieur en chef", "النسخة التجريبية لكبير المهندسين"),
    suspects: [
      R(tl("a passed-over coder", "un développeur écarté d'une promotion", "مبرمج تخطّته الترقية"), tl("says they were at lunch", "dit avoir été à la pause déjeuner", "يقول إنه كان في استراحة الغداء"), tl("wanted the promotion", "convoitait la promotion", "كان يطمع في الترقية")),
      R(tl("the QA lead", "le responsable qualité", "مسؤول ضمان الجودة"), tl("was running tests", "exécutait des tests", "كان يجري الاختبارات"), tl("warned about the deadline", "avait alerté sur le délai", "حذّر من ضيق المهلة")),
      R(tl("a departing intern", "un stagiaire sur le départ", "متدرب على وشك المغادرة"), tl("claims they'd already left", "prétend être déjà parti", "يدّعي أنه غادر قبلها"), tl("held a grudge over credit", "en voulait pour une question de crédit", "يحمل ضغينة بسبب نسب الإنجاز")),
      R(tl("the ops admin", "l'administrateur systèmes", "مسؤول التشغيل"), tl("was patching servers", "mettait à jour les serveurs", "كان يحدّث الخوادم"), tl("controls the deploy keys", "contrôle les clés de déploiement", "يتحكم بمفاتيح النشر")),
    ],
    culprit: 3, herring: 0,
    motive: tl("burning a project that sidelined them", "détruire un projet qui l'avait mis à l'écart", "تدمير مشروع همّشه"),
    means: tl("a rogue deploy script", "un script de déploiement pirate", "سكربت نشر خبيث"),
    keyTime: tl("2:05 AM", "2 h 05", "2:05 فجرًا"),
    clue: tl("the deploy server login", "la connexion au serveur de déploiement", "سجل الدخول إلى خادم النشر"),
    witnessLine: tl("{c} pushed a change overnight that nobody approved.", "{c} a poussé pendant la nuit une modification que personne n'avait validée.", "دفع {c} تعديلًا ليلًا لم يوافق عليه أحد."),
  },
  {
    place: tl("in the Rowan estate library", "dans la bibliothèque du domaine Rowan", "في مكتبة ضيعة روان"),
    crime: "murder",
    victimRole: tl("the reclusive heir", "l'héritier reclus", "الوريث المنعزل"),
    suspects: [
      R(tl("the family lawyer", "l'avocat de la famille", "محامي العائلة"), tl("says they were reviewing the will", "dit avoir relu le testament", "يقول إنه كان يراجع الوصية"), tl("drafted a suspicious codicil", "a rédigé un codicille suspect", "صاغ ملحقًا مريبًا للوصية")),
      R(tl("a disowned cousin", "un cousin déshérité", "قريب محروم من الميراث"), tl("claims to have been in town", "prétend avoir été en ville", "يدّعي أنه كان في المدينة"), tl("was cut from the inheritance", "a été rayé de l'héritage", "شُطب من الوصية")),
      R(tl("the live-in nurse", "l'infirmière à demeure", "الممرضة المقيمة"), tl("was preparing medication", "préparait les médicaments", "كانت تجهّز الدواء"), tl("controlled the victim's pills", "gérait les comprimés de la victime", "تتحكم بأدوية الضحية")),
      R(tl("the groundskeeper", "le jardinier du domaine", "حارس الحديقة"), tl("was trimming the hedges", "taillait les haies", "كان يشذّب السياج"), tl("was owed back wages", "attendait des salaires impayés", "له أجور متأخرة")),
    ],
    culprit: 2, herring: 1,
    motive: tl("a forged inheritance that only worked if the heir died first", "un héritage falsifié qui n'avait de valeur que si l'héritier mourait d'abord", "ميراث مزوّر لا ينفع إلا إذا مات الوريث أولًا"),
    means: tl("an overdose", "une surdose", "جرعة زائدة"),
    keyTime: tl("10:50 PM", "22 h 50", "10:50 مساءً"),
    clue: tl("the medicine cabinet log", "le registre de l'armoire à pharmacie", "سجل خزانة الأدوية"),
    witnessLine: tl("{c} handled the pills alone that night.", "{c} a manipulé les comprimés seul ce soir-là.", "تولّى {c} الأدوية وحده تلك الليلة."),
  },
  {
    place: tl("at the Belrose bank branch", "à l'agence bancaire Belrose", "في فرع مصرف بلروز"),
    crime: "fraud",
    victimRole: tl("the branch manager", "le directeur d'agence", "مدير الفرع"),
    suspects: [
      R(tl("a senior teller", "un caissier principal", "صرّاف أول"), tl("says they balanced the drawer", "dit avoir arrêté sa caisse", "يقول إنه كان يسوّي عهدة الصندوق"), tl("had access to dormant accounts", "avait accès aux comptes dormants", "يملك وصولًا إلى الحسابات الخاملة")),
      R(tl("the loan officer", "le chargé de crédits", "موظف القروض"), tl("was with a client", "était avec un client", "كان مع عميل"), tl("approved shady transfers", "a validé des virements douteux", "وافق على تحويلات مشبوهة")),
      R(tl("an IT contractor", "un prestataire informatique", "متعاقد تقنية معلومات"), tl("claims remote work", "invoque du télétravail", "يدّعي العمل عن بُعد"), tl("installed the new system", "a installé le nouveau système", "ركّب النظام الجديد")),
      R(tl("the compliance auditor", "l'auditeur de conformité", "مدقق الامتثال"), tl("was off that week", "était en congé cette semaine-là", "كان في إجازة ذلك الأسبوع"), tl("signs off on the alerts", "valide les alertes", "يوقّع على إنذارات المخالفات")),
    ],
    culprit: 1, herring: 3,
    motive: tl("skimming transfers into a shell account", "détourner des virements vers un compte écran", "تحويل مبالغ خلسة إلى حساب وهمي"),
    means: tl("falsified transfer slips", "des ordres de virement falsifiés", "قسائم تحويل مزوّرة"),
    keyTime: tl("4:30 PM", "16 h 30", "4:30 عصرًا"),
    clue: tl("the transfer approval log", "le journal des validations de virement", "سجل الموافقات على التحويلات"),
    witnessLine: tl("{c} approved transfers no client ever requested.", "{c} a validé des virements qu'aucun client n'avait demandés.", "وافق {c} على تحويلات لم يطلبها أي عميل."),
  },
  {
    place: tl("at the Calder theatre", "au théâtre Calder", "في مسرح كالدر"),
    crime: "disappearance",
    victimRole: tl("the lead actress", "l'actrice principale", "الممثلة الرئيسية"),
    suspects: [
      R(tl("the understudy", "la doublure", "الممثلة البديلة"), tl("says they were in the wings", "dit avoir été en coulisses", "تقول إنها كانت خلف الكواليس"), tl("wanted the role", "convoitait le rôle", "كانت تطمع في الدور")),
      R(tl("the stage manager", "le régisseur", "مدير خشبة المسرح"), tl("was calling the cues", "lançait les tops", "كان يدير إشارات العرض"), tl("clashed over the schedule", "s'opposait sur le planning", "اختلف معها على الجدول")),
      R(tl("a persistent fan", "un admirateur insistant", "معجب ملحاح"), tl("claims a front-row seat", "prétend avoir été au premier rang", "يدّعي أنه كان في الصف الأول"), tl("was banned backstage", "était interdit de coulisses", "ممنوع من دخول الكواليس")),
      R(tl("the director", "le metteur en scène", "المخرج"), tl("was in the booth", "était en régie", "كان في غرفة التحكم"), tl("threatened to recast", "menaçait de changer la distribution", "هدّد بإسناد الدور لغيرها")),
    ],
    culprit: 0, herring: 2,
    motive: tl("removing the only obstacle to the spotlight", "écarter le seul obstacle vers la lumière", "إزاحة العائق الوحيد عن الأضواء"),
    means: tl("a locked prop room", "une réserve d'accessoires verrouillée", "غرفة الدعائم الموصدة"),
    keyTime: tl("the intermission", "l'entracte", "فترة الاستراحة"),
    clue: tl("the backstage door badge", "le badge de la porte des coulisses", "بطاقة باب الكواليس"),
    witnessLine: tl("{c} was the last to enter the star's dressing room.", "{c} a été la dernière personne à entrer dans la loge de la star.", "كان {c} آخر من دخل غرفة النجمة."),
  },
  {
    place: tl("at the Fenwick pharmaceutical lab", "au laboratoire pharmaceutique Fenwick", "في مختبر فينويك للأدوية"),
    crime: "theft",
    victimRole: tl("the research director", "la directrice de recherche", "مديرة الأبحاث"),
    suspects: [
      R(tl("a rival scientist", "un chercheur rival", "عالم منافس"), tl("says they were at a conference", "dit avoir été en conférence", "يقول إنه كان في مؤتمر"), tl("competes for the same grant", "brigue la même subvention", "ينافس على المنحة ذاتها")),
      R(tl("the lab technician", "le technicien du laboratoire", "فني المختبر"), tl("was logging samples", "enregistrait des échantillons", "كان يسجّل العينات"), tl("has full freezer access", "a un accès complet au congélateur", "يملك وصولًا كاملًا للمجمّد")),
      R(tl("a venture investor", "un investisseur en capital-risque", "مستثمر مغامر"), tl("claims a dinner meeting", "invoque un dîner d'affaires", "يدّعي عشاء عمل"), tl("wanted the formula", "voulait la formule", "أراد التركيبة")),
      R(tl("the janitor", "l'agent d'entretien", "عامل النظافة"), tl("was cleaning floor two", "nettoyait le deuxième étage", "كان ينظف الطابق الثاني"), tl("was recently demoted", "venait d'être rétrogradé", "خُفّضت رتبته مؤخرًا")),
    ],
    culprit: 1, herring: 0,
    motive: tl("selling the formula to the highest bidder", "vendre la formule au plus offrant", "بيع التركيبة لمن يدفع أكثر"),
    means: tl("the sample freezer key", "la clé du congélateur à échantillons", "مفتاح مجمّد العينات"),
    keyTime: tl("1:20 AM", "1 h 20", "1:20 فجرًا"),
    clue: tl("the freezer access badge", "le badge d'accès au congélateur", "بطاقة دخول المجمّد"),
    witnessLine: tl("{c} opened the sample freezer after hours.", "{c} a ouvert le congélateur à échantillons après la fermeture.", "فتح {c} مجمّد العينات بعد ساعات العمل."),
  },
  {
    place: tl("at the Underhill ski lodge", "au chalet de ski d'Underhill", "في نُزل أندرهيل للتزلج"),
    crime: "murder",
    victimRole: tl("the resort tycoon", "le magnat de la station", "قطب المنتجع"),
    suspects: [
      R(tl("the estranged son", "le fils en froid avec lui", "الابن المتخاصم معه"), tl("says they were skiing", "dit avoir été sur les pistes", "يقول إنه كان يتزلج"), tl("was written out of the will", "a été rayé du testament", "شُطب من الوصية")),
      R(tl("a bankrupt partner", "un associé ruiné", "شريك مفلس"), tl("was at the bar", "était au bar", "كان في الحانة"), tl("blamed the victim for his ruin", "tenait la victime pour responsable de sa ruine", "حمّل الضحية مسؤولية إفلاسه")),
      R(tl("the lodge manager", "le gérant du chalet", "مدير النُّزل"), tl("was at the front desk", "était à la réception", "كان عند مكتب الاستقبال"), tl("was about to be exposed for theft", "allait être démasqué pour vol", "كان على وشك افتضاح سرقاته")),
      R(tl("a ski instructor", "un moniteur de ski", "مدرب تزلج"), tl("was teaching a class", "donnait un cours", "كان يعطي درسًا"), tl("had a public feud with him", "était en conflit public avec lui", "كان بينه وبين الضحية خصومة علنية")),
    ],
    culprit: 2, herring: 3,
    motive: tl("silencing the man who had caught them stealing", "faire taire l'homme qui l'avait surpris à voler", "إسكات من ضبطه متلبسًا بالسرقة"),
    means: tl("a loosened balcony rail", "une rambarde de balcon desserrée", "درابزين شرفة مُرخى"),
    keyTime: tl("8:40 PM", "20 h 40", "8:40 مساءً"),
    clue: tl("the keycard entry log", "le journal des accès par badge", "سجل الدخول بالبطاقات"),
    witnessLine: tl("{c} was seen tampering with the balcony earlier.", "{c} a été vu plus tôt en train de trafiquer le balcon.", "شوهد {c} يعبث بالشرفة في وقت سابق."),
  },
  {
    place: tl("at the Novak auto plant", "à l'usine automobile Novak", "في مصنع نوفاك للسيارات"),
    crime: "sabotage",
    victimRole: tl("the line supervisor's flagship car", "la voiture vitrine du chef de ligne", "السيارة النموذجية لمشرف خط الإنتاج"),
    suspects: [
      R(tl("a union organizer", "un délégué syndical", "منظّم نقابي"), tl("says they were in a meeting", "dit avoir été en réunion", "يقول إنه كان في اجتماع"), tl("clashed over the layoffs", "s'opposait sur les licenciements", "اختلف معه حول التسريحات")),
      R(tl("the parts supplier", "le fournisseur de pièces", "مورّد قطع الغيار"), tl("was off-site", "était à l'extérieur", "كان خارج الموقع"), tl("was caught cutting corners", "a été pris à rogner sur la qualité", "ضُبط يتلاعب بالمواصفات")),
      R(tl("a night-shift welder", "un soudeur de nuit", "لحّام في الوردية الليلية"), tl("was on a break", "était en pause", "كان في استراحة"), tl("was passed over for team lead", "a été écarté du poste de chef d'équipe", "تخطّوه في ترقية رئيس الفريق")),
      R(tl("the quality inspector", "l'inspecteur qualité", "مفتش الجودة"), tl("was signing off units", "validait des unités", "كان يعتمد الوحدات"), tl("controls the pass stamp", "détient le tampon de conformité", "يتحكم بختم الاعتماد")),
    ],
    culprit: 3, herring: 1,
    motive: tl("hiding their own defective inspections", "dissimuler ses propres inspections défaillantes", "إخفاء تفتيشاته المعيبة"),
    means: tl("a swapped brake component", "une pièce de frein substituée", "قطعة مكابح مستبدلة"),
    keyTime: tl("3:15 AM", "3 h 15", "3:15 فجرًا"),
    clue: tl("the inspection scanner log", "le journal du scanner d'inspection", "سجل ماسح الفحص"),
    witnessLine: tl("{c} stamped a unit they never actually checked.", "{c} a tamponné une unité qu'il n'avait jamais contrôlée.", "ختم {c} وحدة لم يفحصها قط."),
  },
  {
    place: tl("at the Delacroix vineyard", "au vignoble Delacroix", "في مزرعة ديلاكروا"),
    crime: "fraud",
    victimRole: tl("the estate owner", "le propriétaire du domaine", "صاحب المزرعة"),
    suspects: [
      R(tl("the distributor", "le distributeur", "الموزّع"), tl("says they were at a tasting", "dit avoir été à une dégustation", "يقول إنه كان في جلسة تذوق"), tl("profits from mislabeled crates", "profite des caisses mal étiquetées", "يربح من الصناديق المزيفة الملصقات")),
      R(tl("a product expert", "un expert produit", "خبير منتجات"), tl("was hosting a tour", "guidait une visite", "كان يقود جولة"), tl("authenticates the vintages", "authentifie les millésimes", "يوثّق أصالة الإنتاج")),
      R(tl("the bookkeeper", "le comptable", "ماسك الدفاتر"), tl("was reconciling invoices", "rapprochait des factures", "كان يطابق الفواتير"), tl("keeps the ledgers", "tient les registres", "يتولى السجلات")),
      R(tl("a seasonal picker", "un saisonnier des récoltes", "عامل قطاف موسمي"), tl("was in the fields", "était dans les champs", "كان في الحقول"), tl("holds a grudge over pay", "nourrit une rancune salariale", "يحمل ضغينة بسبب الأجر")),
    ],
    culprit: 2, herring: 0,
    motive: tl("hiding years of skimmed revenue", "dissimuler des années de recettes détournées", "إخفاء سنوات من الإيرادات المختلسة"),
    means: tl("doctored ledgers", "des registres trafiqués", "دفاتر محرّفة"),
    keyTime: tl("5:00 PM", "17 h 00", "5:00 مساءً"),
    clue: tl("the accounting login trail", "la trace des connexions comptables", "أثر تسجيلات الدخول المحاسبية"),
    witnessLine: tl("{c} edited invoices after the books were closed.", "{c} a modifié des factures après la clôture des comptes.", "عدّل {c} فواتير بعد إقفال الدفاتر."),
  },
  {
    place: tl("at the Sterling jewelry vault", "dans la chambre forte de la joaillerie Sterling", "في خزنة مجوهرات سترلينغ"),
    crime: "theft",
    victimRole: tl("the vault manager", "le responsable de la chambre forte", "مدير الخزنة"),
    suspects: [
      R(tl("a diamond broker", "un courtier en diamants", "سمسار ألماس"), tl("says they were traveling", "dit avoir été en déplacement", "يقول إنه كان مسافرًا"), tl("wanted the collection", "convoitait la collection", "كان يطمع في المجموعة")),
      R(tl("the security consultant", "le consultant en sécurité", "مستشار الأمن"), tl("was testing the alarms", "testait les alarmes", "كان يختبر الإنذارات"), tl("designed the very system", "a conçu le système lui-même", "صمّم النظام بنفسه")),
      R(tl("a longtime clerk", "un employé de longue date", "موظف قديم"), tl("was closing the registers", "fermait les caisses", "كان يغلق الصناديق"), tl("resents being underpaid", "s'estime sous-payé", "مستاء من ضآلة راتبه")),
      R(tl("the appraiser", "l'expert en évaluation", "المثمّن"), tl("was off that day", "était en congé ce jour-là", "كان في إجازة ذلك اليوم"), tl("knows every stone's worth", "connaît la valeur de chaque pierre", "يعرف قيمة كل حجر")),
    ],
    culprit: 1, herring: 2,
    motive: tl("the perfect crime against a system they built", "le crime parfait contre un système qu'il avait bâti", "جريمة متقنة ضد نظام صنعه بيده"),
    means: tl("an alarm bypass code", "un code de contournement d'alarme", "رمز لتعطيل الإنذار"),
    keyTime: tl("12:10 AM", "0 h 10", "12:10 بعد منتصف الليل"),
    clue: tl("the alarm control log", "le journal de la centrale d'alarme", "سجل وحدة التحكم بالإنذار"),
    witnessLine: tl("{c} disabled the very alarm they had installed.", "{c} a désactivé l'alarme qu'il avait lui-même installée.", "عطّل {c} الإنذار الذي ركّبه بنفسه."),
  },
  {
    place: tl("at the Aldous newsroom", "à la rédaction d'Aldous", "في غرفة أخبار ألدوس"),
    crime: "disappearance",
    victimRole: tl("the investigative reporter", "la journaliste d'investigation", "الصحفية الاستقصائية"),
    suspects: [
      R(tl("a corrupt official", "un fonctionnaire corrompu", "مسؤول فاسد"), tl("claims a public event", "invoque un événement public", "يتذرّع بحضور فعالية عامة"), tl("was the story's target", "était la cible de l'enquête", "كان هدف التحقيق")),
      R(tl("the editor", "le rédacteur en chef", "رئيس التحرير"), tl("was closing the issue", "bouclait le numéro", "كان يغلق العدد"), tl("spiked the exposé", "a enterré l'article", "أوقف نشر التحقيق")),
      R(tl("a rival journalist", "un journaliste rival", "صحفي منافس"), tl("says they were chasing a lead", "dit avoir suivi une piste", "يقول إنه كان يتعقب خيطًا"), tl("wanted the byline", "voulait la signature", "أراد نسب السبق لنفسه")),
      R(tl("a nervous source", "une source inquiète", "مصدر متوتر"), tl("was at home", "était chez elle", "كان في منزله"), tl("feared being named", "craignait d'être nommée", "خشي انكشاف اسمه")),
    ],
    culprit: 0, herring: 3,
    motive: tl("burying a story that would end their career", "enterrer un article qui aurait ruiné sa carrière", "دفن قصة كانت ستنهي مسيرته"),
    means: tl("a black sedan", "une berline noire", "سيارة سوداء"),
    keyTime: tl("11:00 PM", "23 h 00", "11:00 مساءً"),
    clue: tl("the parking garage camera", "la caméra du parking", "كاميرا مرآب السيارات"),
    witnessLine: tl("{c}'s car followed the reporter out of the garage.", "La voiture de {c} a suivi la journaliste hors du parking.", "تبعت سيارة {c} الصحفية عند خروجها من المرآب."),
  },
  {
    place: tl("at the Whitlock university lab", "au laboratoire de l'université Whitlock", "في مختبر جامعة ويتلوك"),
    crime: "murder",
    victimRole: tl("the tenured professor", "le professeur titulaire", "الأستاذ الجامعي المثبّت"),
    suspects: [
      R(tl("a passed-over postdoc", "un post-doctorant écarté", "باحث ما بعد الدكتوراه المُهمَل"), tl("says they were grading", "dit avoir corrigé des copies", "يقول إنه كان يصحح الأوراق"), tl("was denied co-authorship", "s'est vu refuser la co-signature", "حُرم من المشاركة في التأليف")),
      R(tl("the department head", "le chef de département", "رئيس القسم"), tl("was in a faculty meeting", "était en conseil de faculté", "كان في اجتماع الكلية"), tl("feuded over funding", "se disputait les financements", "تنازع معه على التمويل")),
      R(tl("a failing grad student", "un doctorant en échec", "طالب دراسات عليا متعثر"), tl("was in the library", "était à la bibliothèque", "كان في المكتبة"), tl("faced expulsion", "risquait l'exclusion", "كان مهددًا بالفصل")),
      R(tl("the lab manager", "le responsable du laboratoire", "مدير المختبر"), tl("was ordering supplies", "passait des commandes", "كان يطلب المستلزمات"), tl("handles the chemicals", "gère les produits chimiques", "يتولى المواد الكيميائية")),
    ],
    culprit: 0, herring: 1,
    motive: tl("stealing credit for a career-making discovery", "s'approprier une découverte décisive pour sa carrière", "سرقة فضل اكتشاف يصنع مسيرة مهنية"),
    means: tl("a tampered reagent", "un réactif trafiqué", "كاشف كيميائي مُعبث به"),
    keyTime: tl("7:25 PM", "19 h 25", "7:25 مساءً"),
    clue: tl("the lab door badge", "le badge de la porte du laboratoire", "بطاقة باب المختبر"),
    witnessLine: tl("{c} was alone in the lab just before the professor collapsed.", "{c} était seul dans le laboratoire juste avant que le professeur ne s'effondre.", "كان {c} وحده في المختبر قبيل انهيار الأستاذ."),
  },
  {
    place: tl("at the Cormac shipping depot", "au dépôt de fret Cormac", "في مستودع كورماك للشحن"),
    crime: "theft",
    victimRole: tl("the logistics chief", "le chef logistique", "رئيس الخدمات اللوجستية"),
    suspects: [
      R(tl("a warehouse foreman", "un contremaître d'entrepôt", "رئيس عمال المستودع"), tl("says they were on the dock", "dit avoir été sur le quai", "يقول إنه كان على الرصيف"), tl("controls the manifest", "contrôle le manifeste", "يتحكم ببيان الشحنة")),
      R(tl("a truck driver", "un chauffeur routier", "سائق شاحنة"), tl("was out on a route", "était en tournée", "كان في مهمة توصيل"), tl("was caught skimming before", "a déjà été pris à détourner", "ضُبط يختلس من قبل")),
      R(tl("the customs agent", "l'agent des douanes", "موظف الجمارك"), tl("was at the office", "était au bureau", "كان في المكتب"), tl("clears the containers", "dédouane les conteneurs", "يخلّص الحاويات")),
      R(tl("an inventory clerk", "un magasinier", "كاتب الجرد"), tl("was counting stock", "faisait l'inventaire", "كان يُحصي المخزون"), tl("flags the discrepancies", "signale les écarts", "يبلّغ عن الفروقات")),
    ],
    culprit: 0, herring: 3,
    motive: tl("diverting containers to a fence", "détourner des conteneurs vers un receleur", "تحويل حاويات إلى تاجر مسروقات"),
    means: tl("an altered manifest", "un manifeste falsifié", "بيان شحن محرّف"),
    keyTime: tl("6:45 AM", "6 h 45", "6:45 صباحًا"),
    clue: tl("the manifest edit log", "le journal des modifications du manifeste", "سجل تعديلات بيان الشحن"),
    witnessLine: tl("{c} rewrote the manifest before the audit.", "{c} a réécrit le manifeste avant l'audit.", "أعاد {c} كتابة بيان الشحن قبل التدقيق."),
  },
  {
    place: tl("at the Everly charity gala", "au gala de charité Everly", "في حفل إيفرلي الخيري"),
    crime: "fraud",
    victimRole: tl("the foundation director", "la directrice de la fondation", "مديرة المؤسسة الخيرية"),
    suspects: [
      R(tl("the event planner", "l'organisatrice de l'événement", "منظّم الحفل"), tl("was managing the floor", "gérait la salle", "كان يدير القاعة"), tl("inflated the invoices", "a gonflé les factures", "ضخّم الفواتير")),
      R(tl("a board member", "un membre du conseil", "عضو مجلس الإدارة"), tl("was giving a speech", "prononçait un discours", "كان يلقي كلمة"), tl("controls the accounts", "contrôle les comptes", "يتحكم بالحسابات")),
      R(tl("the treasurer", "le trésorier", "أمين الصندوق"), tl("was counting donations", "comptait les dons", "كان يُحصي التبرعات"), tl("handles every transfer", "gère chaque virement", "يتولى كل التحويلات")),
      R(tl("a celebrity guest", "une invitée célèbre", "ضيف مشهور"), tl("was at their table", "était à sa table", "كان على طاولته"), tl("pledged a big gift", "a promis un don important", "تعهّد بتبرع كبير")),
    ],
    culprit: 2, herring: 1,
    motive: tl("funneling donations into a personal fund", "détourner les dons vers un fonds personnel", "تحويل التبرعات إلى حساب شخصي"),
    means: tl("a rerouted donation account", "un compte de dons détourné", "حساب تبرعات محوَّل"),
    keyTime: tl("9:50 PM", "21 h 50", "9:50 مساءً"),
    clue: tl("the payment gateway log", "le journal de la passerelle de paiement", "سجل بوابة الدفع"),
    witnessLine: tl("{c} switched the donation account mid-event.", "{c} a changé le compte des dons en plein événement.", "بدّل {c} حساب التبرعات في منتصف الحفل."),
  },
  {
    place: tl("at the Pinehaven summer camp", "au camp d'été de Pinehaven", "في مخيّم باينهيفن الصيفي"),
    crime: "disappearance",
    victimRole: tl("the camp director", "le directeur du camp", "مدير المخيم"),
    suspects: [
      R(tl("a disgruntled counselor", "un moniteur mécontent", "مشرف ساخط"), tl("says they were at the lake", "dit avoir été au lac", "يقول إنه كان عند البحيرة"), tl("was about to be fired", "allait être renvoyé", "كان على وشك الطرد")),
      R(tl("the caretaker", "le gardien", "القيّم على المكان"), tl("was fixing the cabins", "réparait les cabanes", "كان يصلح الأكواخ"), tl("knows every trail", "connaît chaque sentier", "يعرف كل الدروب")),
      R(tl("a parent volunteer", "un parent bénévole", "وليّ أمر متطوع"), tl("claims they had gone home", "prétend être rentré chez lui", "يدّعي أنه عاد إلى منزله"), tl("threatened to sue", "menaçait de porter plainte", "هدّد برفع دعوى")),
      R(tl("the cook", "le cuisinier", "الطاهي"), tl("was in the mess hall", "était au réfectoire", "كان في قاعة الطعام"), tl("has a hidden past", "cache un passé trouble", "له ماضٍ خفي")),
    ],
    culprit: 1, herring: 0,
    motive: tl("hiding a secret the director had uncovered", "étouffer un secret que le directeur avait découvert", "إخفاء سرّ اكتشفه المدير"),
    means: tl("an old service road", "une vieille route de service", "طريق خدمة قديم"),
    keyTime: tl("5:30 AM", "5 h 30", "5:30 فجرًا"),
    clue: tl("the gate sensor log", "le journal du capteur du portail", "سجل حساس البوابة"),
    witnessLine: tl("{c} drove down the service road before sunrise.", "{c} a emprunté la route de service avant l'aube.", "سلك {c} طريق الخدمة قبل شروق الشمس."),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MINI case factory (quick 2-min, 3 suspects)
// ─────────────────────────────────────────────────────────────────────────────
interface MiniPack {
  title: L;
  place: L;    // WITH preposition: "at the corner café"
  crime: Crime;
  target: L;   // what was hit: "A finished manuscript"
  roles: [L, L, L];
  culprit: 0 | 1 | 2;
  herring: 0 | 1 | 2;
  motive: L;
  clue: L;     // with article: "the wifi wipe log"
  keyTime: L;
}

function buildMini(pack: MiniPack, availableDate: string, instance: number) {
  const base = instance * 4;
  const sNames = [1, 2, 3].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const cName = sNames[pack.culprit];
  const hName = sNames[pack.herring];
  const p = pack;
  return {
    kind: "mini" as const,
    title: p.title,
    description: make((l) =>
      l === "fr" ? `${p.target.fr} ${p.place.fr}. Trois personnes se trouvaient à proximité — trouvez vite le coupable.`
      : l === "ar" ? `${p.target.ar} ${p.place.ar}. ثلاثة أشخاص كانوا قريبين — اكتشف الفاعل بسرعة.`
      : `${p.target.en} ${p.place.en}. Three people were close by — spot the culprit fast.`),
    type: p.crime,
    difficulty: "easy" as const,
    status: "active" as const,
    availableDate,
    estimatedMinutes: 2,
    maxScore: 300,
    victim: {
      name: p.target,
      description: make((l) =>
        l === "fr" ? `Pris pour cible ${p.place.fr}.`
        : l === "ar" ? `استُهدف ${p.place.ar}.`
        : `Targeted ${p.place.en}.`),
      avatar: "default_victim",
    },
    suspects: sNames.map((n, i) => ({
      id: `suspect_${i + 1}`,
      name: n,
      description: make((l) => `${n[l]} — ${p.roles[i][l]}.`),
      alibi: i === p.culprit
        ? tl("gives a shaky account", "donne une version confuse", "يقدّم رواية مضطربة")
        : tl("has a plausible story", "a une version plausible", "لديه رواية مقنعة"),
      relationship: p.roles[i],
      avatar: "default_suspect",
    })),
    evidence: [
      {
        id: "ev_1",
        title: make((l) => cap(p.clue[l])),
        description: make((l) =>
          l === "fr" ? `${cap(p.clue.fr)} révèle qui a agi à ${p.keyTime.fr}.`
          : l === "ar" ? `${p.clue.ar} يكشف من تحرّك قرابة ${p.keyTime.ar}.`
          : `${cap(p.clue.en)} shows who acted at ${p.keyTime.en}.`),
        type: "digital" as const,
        isRedHerring: false,
      },
      {
        id: "ev_2",
        title: tl("An Obvious Motive", "Un mobile trop évident", "دافع واضح أكثر من اللازم"),
        description: make((l) =>
          l === "fr" ? `${hName.fr} avait la rancune la plus bruyante — trop évident.`
          : l === "ar" ? `${hName.ar} كان صاحب الضغينة الأعلى صوتًا — أوضح من اللازم.`
          : `${hName.en} had the loudest grudge — too obvious.`),
        type: "testimonial" as const,
        isRedHerring: true,
      },
    ],
    witnessStatements: [
      {
        id: "w_1",
        witnessName: nameAt(base),
        statement: make((l) =>
          l === "fr" ? `J'ai vu ${cName.fr} ${p.place.fr} à ${p.keyTime.fr}.`
          : l === "ar" ? `رأيت ${cName.ar} ${p.place.ar} قرابة ${p.keyTime.ar}.`
          : `I saw ${cName.en} ${p.place.en} at ${p.keyTime.en}.`),
        reliability: "reliable" as const,
      },
    ],
    timeline: [
      {
        id: "t_1",
        time: tl("Before", "Avant", "قبل الحادثة"),
        description: make((l) =>
          l === "fr" ? `Tout est calme ${p.place.fr}.`
          : l === "ar" ? `كل شيء هادئ ${p.place.ar}.`
          : `All is quiet ${p.place.en}.`),
        involvedSuspects: [],
      },
      {
        id: "t_2",
        time: p.keyTime,
        description: make((l) =>
          l === "fr" ? `${cName.fr} passe à l'acte — trahi par ${p.clue.fr}.`
          : l === "ar" ? `${cName.ar} ينفّذ فعلته — ويفضحه ${p.clue.ar}.`
          : `${cName.en} acts — caught by ${p.clue.en}.`),
        involvedSuspects: [culpritId],
      },
    ],
    solution: {
      suspectId: culpritId,
      motive: p.motive,
      weapon: "",
      timelineEventId: "t_2",
      explanation: make((l) =>
        l === "fr" ? `C'est ${cName.fr} — ${p.clue.fr} le place ${p.place.fr} à ${p.keyTime.fr}. Mobile : ${p.motive.fr}. La rancune bruyante de ${hName.fr} n'était qu'un leurre.`
        : l === "ar" ? `الفاعل هو ${cName.ar} — ${p.clue.ar} يثبت وجوده ${p.place.ar} قرابة ${p.keyTime.ar}. الدافع: ${p.motive.ar}. أما ضغينة ${hName.ar} الصاخبة فكانت خدعة.`
        : `${cName.en} did it — ${p.clue.en} puts them ${p.place.en} at ${p.keyTime.en}. Motive: ${p.motive.en}. ${hName.en}'s loud grudge was a red herring.`),
    },
  };
}

const MINI_PACKS: MiniPack[] = [
  { title: tl("The Spilled Latte", "Le latte renversé", "اللاتيه المسكوب"), place: tl("at the corner café", "au café du coin", "في مقهى الزاوية"), crime: "sabotage", target: tl("A finished manuscript", "Un manuscrit achevé", "مخطوطة مكتملة"), roles: [tl("a rival writer", "un écrivain rival", "كاتب منافس"), tl("the barista", "le barista", "عامل المقهى"), tl("a quiet regular", "un habitué discret", "زبون دائم هادئ")], culprit: 0, herring: 1, motive: tl("sinking a competitor's book", "couler le livre d'un concurrent", "إغراق كتاب منافس"), clue: tl("the wifi wipe log", "le journal d'effacement du wifi", "سجل مسح شبكة الواي فاي"), keyTime: tl("3:02 PM", "15 h 02", "3:02 عصرًا") },
  { title: tl("The Locker Room Ring", "La bague des vestiaires", "خاتم غرفة الملابس"), place: tl("at the gym", "à la salle de sport", "في النادي الرياضي"), crime: "theft", target: tl("A championship ring", "Une bague de championnat", "خاتم بطولة"), roles: [tl("a new member", "un nouveau membre", "عضو جديد"), tl("the attendant", "le préposé", "عامل الاستقبال"), tl("a regular", "un habitué", "مرتاد دائم")], culprit: 1, herring: 0, motive: tl("quick cash", "de l'argent facile", "مال سريع"), clue: tl("the master-key swipe", "le passage du passe-partout", "أثر استخدام المفتاح الرئيسي"), keyTime: tl("6:14 PM", "18 h 14", "6:14 مساءً") },
  { title: tl("The Poisoned Bonsai", "Le bonsaï empoisonné", "شجرة البونساي المسمومة"), place: tl("at the office", "au bureau", "في المكتب"), crime: "sabotage", target: tl("A prize bonsai", "Un bonsaï primé", "شجرة بونساي حائزة على جائزة"), roles: [tl("a sore-loser coworker", "un collègue mauvais perdant", "زميل لا يتقبل الخسارة"), tl("the cleaner", "l'agent d'entretien", "عامل التنظيف"), tl("the facilities manager", "le responsable des locaux", "مسؤول المرافق")], culprit: 0, herring: 2, motive: tl("revenge for last year's loss", "se venger de la défaite de l'an dernier", "الثأر لخسارة العام الماضي"), clue: tl("the after-hours badge-in", "le badgeage après la fermeture", "تسجيل دخول بعد الدوام"), keyTime: tl("7:40 PM", "19 h 40", "7:40 مساءً") },
  { title: tl("The Missing Tip Jar", "Le pot à pourboires disparu", "صندوق البقشيش المفقود"), place: tl("at the diner", "au restaurant de quartier", "في المطعم الشعبي"), crime: "theft", target: tl("The tip jar", "Le pot à pourboires", "صندوق البقشيش"), roles: [tl("a busboy", "un commis de salle", "عامل تنظيف الطاولات"), tl("a late customer", "un client tardif", "زبون متأخر"), tl("the line cook", "le cuisinier", "طاهي المطبخ")], culprit: 2, herring: 1, motive: tl("covering a debt", "éponger une dette", "سداد دين"), clue: tl("the counter camera", "la caméra du comptoir", "كاميرا المنضدة"), keyTime: tl("11:20 PM", "23 h 20", "11:20 مساءً") },
  { title: tl("The Deleted Playlist", "La playlist effacée", "قائمة الأغاني المحذوفة"), place: tl("at the radio station", "à la station de radio", "في محطة الإذاعة"), crime: "sabotage", target: tl("The morning playlist", "La playlist du matin", "قائمة أغاني الصباح"), roles: [tl("a bumped DJ", "un DJ évincé", "مذيع أُقصي من البث"), tl("the intern", "le stagiaire", "المتدرب"), tl("the producer", "le producteur", "المنتج")], culprit: 0, herring: 2, motive: tl("jealousy over airtime", "la jalousie du temps d'antenne", "الغيرة من وقت البث"), clue: tl("the console login", "la connexion à la console", "تسجيل الدخول إلى وحدة التحكم"), keyTime: tl("5:10 AM", "5 h 10", "5:10 فجرًا") },
  { title: tl("The Swapped Trophy", "Le trophée échangé", "الكأس المستبدلة"), place: tl("in the school hall", "dans le hall du lycée", "في قاعة المدرسة"), crime: "theft", target: tl("The debate trophy", "Le trophée de débat", "كأس المناظرة"), roles: [tl("a runner-up", "un finaliste battu", "وصيف خاسر"), tl("the janitor", "le concierge", "عامل النظافة"), tl("a teacher", "un professeur", "معلّم")], culprit: 0, herring: 1, motive: tl("wounded pride", "l'orgueil blessé", "كبرياء مجروحة"), clue: tl("the hallway camera", "la caméra du couloir", "كاميرا الممر"), keyTime: tl("4:05 PM", "16 h 05", "4:05 عصرًا") },
  { title: tl("The Sour Milk Batch", "Le lot de lait tourné", "دفعة الحليب الفاسدة"), place: tl("at the creamery", "à la laiterie", "في معمل الألبان"), crime: "sabotage", target: tl("The award batch", "Le lot primé", "الدفعة المرشحة للجائزة"), roles: [tl("a rival dairy hand", "un ouvrier d'une laiterie rivale", "عامل ألبان منافس"), tl("the inspector", "l'inspecteur", "المفتش"), tl("a delivery driver", "un livreur", "سائق توصيل")], culprit: 1, herring: 0, motive: tl("rigging the county fair", "truquer le concours régional", "التلاعب بمسابقة المقاطعة"), clue: tl("the cooler log", "le journal de la chambre froide", "سجل غرفة التبريد"), keyTime: tl("2:30 AM", "2 h 30", "2:30 فجرًا") },
  { title: tl("The Vanished Bicycle", "Le vélo disparu", "الدراجة المختفية"), place: tl("at the campus bike rack", "au parc à vélos du campus", "عند مواقف دراجات الحرم الجامعي"), crime: "theft", target: tl("A racing bicycle", "Un vélo de course", "دراجة سباق"), roles: [tl("a teammate", "un coéquipier", "زميل في الفريق"), tl("a stranger", "un inconnu", "شخص غريب"), tl("the rack attendant", "le gardien du parc", "حارس الموقف")], culprit: 0, herring: 1, motive: tl("eliminating a race rival", "éliminer un rival de course", "إقصاء منافس في السباق"), clue: tl("the cut lock mark", "la trace de coupe sur l'antivol", "أثر قطع القفل"), keyTime: tl("1:15 PM", "13 h 15", "1:15 ظهرًا") },
  { title: tl("The Cut Stage Cable", "Le câble de scène sectionné", "كابل المسرح المقطوع"), place: tl("at the club", "au club", "في النادي الموسيقي"), crime: "sabotage", target: tl("The headliner's rig", "Le matériel de la tête d'affiche", "معدّات نجم الحفل"), roles: [tl("the opening act", "la première partie", "فرقة الافتتاح"), tl("a roadie", "un machiniste", "عامل تجهيزات"), tl("the sound tech", "le technicien du son", "فني الصوت")], culprit: 2, herring: 0, motive: tl("settling a pay dispute", "régler un différend salarial", "تصفية خلاف على الأجر"), clue: tl("the backstage badge", "le badge des coulisses", "بطاقة الكواليس"), keyTime: tl("8:55 PM", "20 h 55", "8:55 مساءً") },
  { title: tl("The Emptied Register", "La caisse vidée", "الصندوق المُفرغ"), place: tl("at the bookstore", "à la librairie", "في المكتبة"), crime: "theft", target: tl("The register float", "Le fonds de caisse", "نقود الصندوق"), roles: [tl("a temp clerk", "un vendeur intérimaire", "موظف مؤقت"), tl("a browser", "un simple curieux", "متصفح للكتب"), tl("the owner's nephew", "le neveu du propriétaire", "ابن أخ المالك")], culprit: 2, herring: 1, motive: tl("a gambling debt", "une dette de jeu", "دين قمار"), clue: tl("the till audit trail", "la piste d'audit de la caisse", "سجل تدقيق الصندوق"), keyTime: tl("6:40 PM", "18 h 40", "6:40 مساءً") },
  { title: tl("The Ruined Mural", "La fresque saccagée", "الجدارية المخرَّبة"), place: tl("on the plaza", "sur la grand-place", "في الساحة العامة"), crime: "sabotage", target: tl("The contest mural", "La fresque du concours", "جدارية المسابقة"), roles: [tl("a losing artist", "un artiste recalé", "فنان خاسر"), tl("a passerby", "un passant", "أحد المارة"), tl("the caretaker", "le gardien des lieux", "القيّم على المكان")], culprit: 0, herring: 2, motive: tl("spite over the jury's choice", "le dépit du choix du jury", "نقمة على قرار لجنة التحكيم"), clue: tl("the paint-store receipt", "le reçu du magasin de peinture", "إيصال متجر الدهانات"), keyTime: tl("10:10 PM", "22 h 10", "10:10 مساءً") },
  { title: tl("The Faked Time Card", "La carte de pointage falsifiée", "بطاقة الدوام المزوّرة"), place: tl("at the warehouse", "à l'entrepôt", "في المستودع"), crime: "fraud", target: tl("The overtime sheet", "La feuille d'heures supplémentaires", "كشف العمل الإضافي"), roles: [tl("a shift worker", "un ouvrier posté", "عامل وردية"), tl("the supervisor", "le superviseur", "المشرف"), tl("a temp", "un intérimaire", "عامل مؤقت")], culprit: 1, herring: 0, motive: tl("padding a paycheck", "gonfler sa paie", "تضخيم الراتب"), clue: tl("the scanner mismatch", "l'incohérence du pointage", "تضارب بيانات الماسح"), keyTime: tl("9:00 PM", "21 h 00", "9:00 مساءً") },
];

// ─────────────────────────────────────────────────────────────────────────────
// MEGA case factory (weekly event, 5 suspects + motive/weapon picks)
// ─────────────────────────────────────────────────────────────────────────────
interface MegaPack {
  title: L;
  place: L;      // WITH preposition
  crime: Crime;
  victimRole: L;
  difficulty: Difficulty;
  suspects: [Role, Role, Role, Role, Role];
  culprit: 0 | 1 | 2 | 3 | 4;
  herring: 0 | 1 | 2 | 3 | 4;
  motives: L[];    // pick options (chips) — the true one is motives[motiveIdx]
  weapons: L[];    // pick options — the true one is weapons[weaponIdx]
  motiveIdx: number;
  weaponIdx: number;
  keyTime: L;
  clue: L;         // with article
}

function buildMega(pack: MegaPack, availableDate: string, instance: number) {
  const base = 1000 + instance * 7;
  const victimName = nameAt(base);
  const sNames = [1, 2, 3, 4, 5].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const cName = sNames[pack.culprit];
  const hName = sNames[pack.herring];
  const p = pack;
  // The solution references the SAME L objects as the option chips, so scoring
  // (resolved to the caller's language) always matches the displayed option.
  const motive = p.motives[p.motiveIdx];
  const weapon = p.weapons[p.weaponIdx];
  return {
    case_: {
      kind: "mega" as const,
      title: p.title,
      description: make((l) =>
        l === "fr" ? `${cap(p.victimRole.fr)}, ${victimName.fr}, est au cœur d'une affaire à haut risque ${p.place.fr}. Cinq suspects, une seule vérité — désignez le coupable, le mobile et l'arme.`
        : l === "ar" ? `${p.victimRole.ar} ${victimName.ar} في قلب قضية كبرى ${p.place.ar}. خمسة مشتبه بهم وحقيقة واحدة — حدد الجاني والدافع والوسيلة.`
        : `${cap(p.victimRole.en)}, ${victimName.en}, is at the center of a high-stakes case ${p.place.en}. Five suspects, one truth — name the culprit, the motive and the method.`),
      type: p.crime,
      difficulty: p.difficulty,
      status: "active" as const,
      availableDate,
      estimatedMinutes: 30,
      maxScore: p.difficulty === "expert" ? 3000 : 2500,
      victim: {
        name: victimName,
        description: make((l) => `${cap(p.victimRole[l])}.`),
        avatar: "default_victim",
      },
      suspects: sNames.map((n, i) => ({
        id: `suspect_${i + 1}`,
        name: n,
        description: make((l) => `${n[l]} — ${p.suspects[i].role[l]}.`),
        alibi: p.suspects[i].alibi,
        relationship: p.suspects[i].rel,
        avatar: "default_suspect",
      })),
      evidence: [
        {
          id: "ev_1",
          title: make((l) => cap(p.clue[l])),
          description: make((l) =>
            l === "fr" ? `${cap(p.clue.fr)} relie quelqu'un aux lieux ${p.place.fr} à ${p.keyTime.fr}.`
            : l === "ar" ? `${p.clue.ar} يربط أحدهم بالمكان ${p.place.ar} قرابة ${p.keyTime.ar}.`
            : `${cap(p.clue.en)} ties someone to the scene ${p.place.en} at ${p.keyTime.en}.`),
          type: "digital" as const,
          isRedHerring: false,
        },
        {
          id: "ev_2",
          title: weapon,
          description: make((l) =>
            l === "fr" ? `La police scientifique relie ${lcf(weapon.fr)} au crime.`
            : l === "ar" ? `يربط خبراء الأدلة الجنائية ${weapon.ar} بالجريمة.`
            : `Forensics link ${lcf(weapon.en)} to the crime.`),
          type: "physical" as const,
          isRedHerring: false,
        },
        {
          id: "ev_3",
          title: tl("A Loud Grudge", "Une rancune tapageuse", "ضغينة صاخبة"),
          description: make((l) =>
            l === "fr" ? `Le conflit public entre ${hName.fr} et la victime semble accablant — et c'est voulu.`
            : l === "ar" ? `الخلاف العلني بين ${hName.ar} والضحية يبدو إدانة دامغة — وهذا مقصود.`
            : `${hName.en}'s public feud with the victim looks damning — and is meant to.`),
          type: "testimonial" as const,
          isRedHerring: true,
        },
        {
          id: "ev_4",
          title: tl("A Planted Item", "Un objet placé là exprès", "غرض مدسوس"),
          description: make((l) =>
            l === "fr" ? `Un objet appartenant à ${hName.fr} apparaît sur les lieux, un peu trop opportunément.`
            : l === "ar" ? `يظهر في مسرح الجريمة غرض يخص ${hName.ar}، في توقيت مريب أكثر من اللازم.`
            : `Something of ${hName.en}'s turns up at the scene, too conveniently.`),
          type: "physical" as const,
          isRedHerring: true,
        },
        {
          id: "ev_5",
          title: tl("The Quiet Motive", "Le mobile silencieux", "الدافع الخفي"),
          description: make((l) =>
            l === "fr" ? `Des documents suggèrent pourquoi ${cName.fr} voulait écarter la victime : ${lcf(motive.fr)}.`
            : l === "ar" ? `تلمّح السجلات إلى سبب رغبة ${cName.ar} في التخلص من الضحية: ${motive.ar}.`
            : `Records hint at why ${cName.en} needed the victim gone: ${lcf(motive.en)}.`),
          type: "document" as const,
          isRedHerring: false,
        },
      ],
      witnessStatements: [
        {
          id: "w_1",
          witnessName: nameAt(base + 6),
          statement: make((l) =>
            l === "fr" ? `${cName.fr} était près des lieux ${p.place.fr} à ${p.keyTime.fr}, tout en le niant.`
            : l === "ar" ? `${cName.ar} كان قرب المكان ${p.place.ar} قرابة ${p.keyTime.ar}، رغم إنكاره ذلك.`
            : `${cName.en} was near the scene ${p.place.en} at ${p.keyTime.en}, though they denied it.`),
          reliability: "reliable" as const,
        },
        {
          id: "w_2",
          witnessName: nameAt(base + 5),
          statement: make((l) =>
            l === "fr" ? `${hName.fr} était ailleurs au moment des faits — j'en jurerais.`
            : l === "ar" ? `${hName.ar} كان في مكان آخر وقت الحادثة — أقسم على ذلك.`
            : `${hName.en} was elsewhere when it happened — I'd swear to it.`),
          reliability: "uncertain" as const,
        },
      ],
      timeline: [
        {
          id: "t_1",
          time: tl("The setup", "La mise en place", "التمهيد"),
          description: make((l) =>
            l === "fr" ? `La tension monte ${p.place.fr}.`
            : l === "ar" ? `يتصاعد التوتر ${p.place.ar}.`
            : `Tensions build ${p.place.en}.`),
          involvedSuspects: [],
        },
        {
          id: "t_2",
          time: p.keyTime,
          description: make((l) =>
            l === "fr" ? `${cName.fr} est placé sur les lieux par ${p.clue.fr}.`
            : l === "ar" ? `${p.clue.ar} يضع ${cName.ar} في مسرح الجريمة.`
            : `${cName.en} is placed at the scene by ${p.clue.en}.`),
          involvedSuspects: [culpritId],
        },
        {
          id: "t_3",
          time: tl("The aftermath", "Les suites", "ما بعد الجريمة"),
          description: tl("The crime is discovered.", "Le crime est découvert.", "تُكتشف الجريمة."),
          involvedSuspects: [],
        },
      ],
      megaOptions: { motives: p.motives, weapons: p.weapons },
      solution: {
        suspectId: culpritId,
        motive,
        weapon,
        timelineEventId: "t_2",
        explanation: make((l) =>
          l === "fr" ? `C'est ${cName.fr} : ${lcf(p.clue.fr)} et ${lcf(weapon.fr)} le placent ${p.place.fr} à ${p.keyTime.fr}. Mobile : ${lcf(motive.fr)}. Tout ce qui accusait ${hName.fr} avait été mis en scène.`
          : l === "ar" ? `الجاني هو ${cName.ar}: ${p.clue.ar} و${weapon.ar} يثبتان وجوده ${p.place.ar} قرابة ${p.keyTime.ar}، والدافع ${motive.ar}. وكل ما كان يشير إلى ${hName.ar} كان مفتعلًا.`
          : `${cName.en} did it: ${lcf(p.clue.en)} and ${lcf(weapon.en)} place them ${p.place.en} at ${p.keyTime.en}, driven by ${lcf(motive.en)}. Everything pointing at ${hName.en} was staged.`),
      },
    },
    title: p.title,
    difficulty: p.difficulty,
  };
}

const MEGA_PACKS: MegaPack[] = [
  {
    title: tl("The Grand Hotel Murder", "Meurtre au Grand Hôtel", "جريمة الفندق الكبير"),
    place: tl("at the Grand Meridian Hotel", "au Grand Hôtel Meridian", "في فندق ميريديان الكبير"),
    crime: "murder",
    victimRole: tl("a ruthless hotel magnate", "un magnat hôtelier impitoyable", "قطب فنادق عديم الرحمة"),
    difficulty: "expert",
    suspects: [
      R(tl("the much-younger spouse", "l'épouse bien plus jeune", "الزوجة الأصغر سنًا بكثير"), tl("claims the rooftop bar", "invoque le bar du toit", "تدّعي أنها كانت في شرفة الفندق العلوية"), tl("the sole heir", "l'unique héritière", "الوريثة الوحيدة")),
      R(tl("the fired architect", "l'architecte licencié", "المهندس المعماري المطرود"), tl("was packing up an office", "vidait son bureau", "كان يوضّب مكتبه"), tl("was publicly humiliated", "a été humilié publiquement", "أُهين علنًا")),
      R(tl("a rival hotelier", "un hôtelier rival", "صاحب فنادق منافس"), tl("was at the gala", "était au gala", "كان في الحفل"), tl("was forced out of the company", "a été évincé de la société", "أُقصي من الشركة")),
      R(tl("the underpaid concierge", "le concierge sous-payé", "البوّاب المبخوس الأجر"), tl("was at the front desk", "était à la réception", "كان عند مكتب الاستقبال"), tl("was owed years of back pay", "attendait des années d'arriérés", "له متأخرات أجور سنوات")),
      R(tl("the personal physician", "le médecin personnel", "الطبيب الخاص"), tl("retired early with a migraine", "s'est retiré tôt avec une migraine", "انسحب مبكرًا بحجة صداع"), tl("hides a malpractice secret", "cache une faute médicale", "يخفي خطأً طبيًا")),
    ],
    culprit: 3, herring: 1,
    motives: [
      tl("Inheritance", "L'héritage", "الميراث"),
      tl("Revenge for being fired", "La vengeance d'un licenciement", "الانتقام للطرد"),
      tl("Years of unpaid wages", "Des années de salaires impayés", "سنوات من الأجور غير المدفوعة"),
      tl("Covering up a medical secret", "Étouffer un secret médical", "التستر على سر طبي"),
      tl("Business rivalry", "La rivalité commerciale", "منافسة تجارية"),
    ],
    weapons: [
      tl("A brass letter opener", "Un coupe-papier en laiton", "فتّاحة رسائل نحاسية"),
      tl("Poisoned wine", "Du vin empoisonné", "شراب مسموم"),
      tl("A silk scarf", "Une écharpe de soie", "وشاح حرير"),
      tl("A blunt object", "Un objet contondant", "أداة صلبة"),
    ],
    motiveIdx: 2, weaponIdx: 0,
    keyTime: tl("11:48 PM", "23 h 48", "11:48 مساءً"),
    clue: tl("the master keycard log", "le journal du passe général", "سجل البطاقة الرئيسية"),
  },
  {
    title: tl("Murder at the Midnight Opera", "Meurtre à l'opéra de minuit", "جريمة أوبرا منتصف الليل"),
    place: tl("at the opera house", "à l'opéra", "في دار الأوبرا"),
    crime: "murder",
    victimRole: tl("a celebrated soprano", "une soprano célèbre", "مغنية سوبرانو ذائعة الصيت"),
    difficulty: "hard",
    suspects: [
      R(tl("the passed-over understudy", "la doublure ignorée", "البديلة المُهملة"), tl("was in the wings", "était en coulisses", "كانت خلف الكواليس"), tl("wanted the lead role", "convoitait le premier rôle", "أرادت دور البطولة")),
      R(tl("the jilted conductor", "le chef d'orchestre éconduit", "قائد الأوركسترا المهجور"), tl("was conducting", "dirigeait l'orchestre", "كان يقود الأوركسترا"), tl("a scorned lover", "un amant éconduit", "عاشق مصدود")),
      R(tl("the indebted producer", "le producteur endetté", "المنتج الغارق في الديون"), tl("watched from a box", "suivait depuis une loge", "كان يشاهد من مقصورة"), tl("insured the victim heavily", "avait lourdement assuré la victime", "أمّن على الضحية بمبلغ ضخم")),
      R(tl("the blamed costume mistress", "la costumière mise en cause", "مسؤولة الأزياء المُلامة"), tl("was steaming costumes", "défroissait des costumes", "كانت تكوي الأزياء"), tl("was publicly humiliated", "a été humiliée en public", "أُهينت علنًا")),
      R(tl("an obsessive superfan", "un admirateur obsessionnel", "معجب مهووس"), tl("was in the front row", "était au premier rang", "كان في الصف الأول"), tl("was recently banned", "venait d'être interdit d'accès", "مُنع مؤخرًا من الدخول")),
    ],
    culprit: 3, herring: 4,
    motives: [
      tl("Jealousy over the role", "La jalousie du rôle", "الغيرة من الدور"),
      tl("A scorned affair", "Une liaison bafouée", "علاقة انتهت بالهجر"),
      tl("An insurance payout", "Une prime d'assurance", "تعويض التأمين"),
      tl("Public humiliation and revenge", "L'humiliation publique et la vengeance", "الإهانة العلنية والانتقام"),
      tl("Obsession", "L'obsession", "الهوس"),
    ],
    weapons: [
      tl("A poisoned throat spray", "Un spray pour la gorge empoisonné", "بخاخ حلق مسموم"),
      tl("A toxic costume pin", "Une épingle de costume toxique", "دبوس زيّ مسموم"),
      tl("A tainted drink", "Une boisson frelatée", "مشروب ملوث"),
      tl("Sabotaged rigging", "Des cintres sabotés", "معدات رفع مخرّبة"),
    ],
    motiveIdx: 3, weaponIdx: 0,
    keyTime: tl("9:20 PM", "21 h 20", "9:20 مساءً"),
    clue: tl("the dressing-room sign-in sheet", "le registre d'accès aux loges", "سجل الدخول إلى غرف الملابس"),
  },
  {
    title: tl("The Cliffside Manor Heist", "Le casse du manoir de la falaise", "سطو قصر الجرف"),
    place: tl("at Cliffside Manor", "au manoir de Cliffside", "في قصر كليفسايد"),
    crime: "theft",
    victimRole: tl("an eccentric art collector", "un collectionneur d'art excentrique", "جامع تحف غريب الأطوار"),
    difficulty: "expert",
    suspects: [
      R(tl("the private curator", "le conservateur privé", "أمين المقتنيات الخاص"), tl("was in the archive", "était aux archives", "كان في الأرشيف"), tl("knows the collection's secrets", "connaît les secrets de la collection", "يعرف أسرار المجموعة")),
      R(tl("a black-market broker", "un courtier du marché noir", "سمسار سوق سوداء"), tl("claims to be abroad", "prétend être à l'étranger", "يدّعي أنه خارج البلاد"), tl("has buyers waiting", "a des acheteurs en attente", "لديه مشترون ينتظرون")),
      R(tl("the estate's heir", "l'héritier du domaine", "وريث الضيعة"), tl("was in the city", "était en ville", "كان في المدينة"), tl("is drowning in debt", "croule sous les dettes", "غارق في الديون")),
      R(tl("the head of security", "le chef de la sécurité", "رئيس الأمن"), tl("was reviewing footage", "visionnait les enregistrements", "كان يراجع التسجيلات"), tl("built the alarm grid", "a conçu le réseau d'alarme", "بنى شبكة الإنذار")),
      R(tl("a restoration artist", "une restauratrice d'œuvres", "فنانة ترميم"), tl("was in the studio", "était à l'atelier", "كانت في المرسم"), tl("can forge a masterpiece", "peut contrefaire un chef-d'œuvre", "تستطيع تزييف تحفة")),
    ],
    culprit: 3, herring: 2,
    motives: [
      tl("A collector's obsession", "L'obsession d'un collectionneur", "هوس المقتنين"),
      tl("A buyer already waiting", "Un acheteur déjà trouvé", "مشترٍ جاهز ينتظر"),
      tl("Crushing debt", "Des dettes écrasantes", "ديون خانقة"),
      tl("The perfect inside job", "Le coup parfait de l'intérieur", "الجريمة الداخلية المتقنة"),
      tl("Artistic revenge", "Une vengeance artistique", "انتقام فني"),
    ],
    weapons: [
      tl("An alarm bypass code", "Un code de contournement d'alarme", "رمز تعطيل الإنذار"),
      tl("A forged replacement canvas", "Une toile de remplacement contrefaite", "لوحة بديلة مزيفة"),
      tl("The guard's drugged coffee", "Le café drogué du gardien", "قهوة الحارس المخدّرة"),
      tl("Cut display glass", "Une vitrine découpée", "زجاج عرض مقطوع"),
    ],
    motiveIdx: 3, weaponIdx: 0,
    keyTime: tl("1:30 AM", "1 h 30", "1:30 فجرًا"),
    clue: tl("the alarm control log", "le journal de la centrale d'alarme", "سجل وحدة التحكم بالإنذار"),
  },
  {
    title: tl("Sabotage at the Space Center", "Sabotage au centre spatial", "تخريب في مركز الفضاء"),
    place: tl("at the launch center", "au centre de lancement", "في مركز الإطلاق"),
    crime: "sabotage",
    victimRole: tl("a flagship satellite program", "un programme satellite phare", "برنامج أقمار صناعية رائد"),
    difficulty: "hard",
    suspects: [
      R(tl("a demoted engineer", "un ingénieur rétrogradé", "مهندس مخفَّض الرتبة"), tl("was in simulations", "était en simulation", "كان في المحاكاة"), tl("was blamed for a past failure", "a été blâmé pour un échec passé", "حُمّل مسؤولية فشل سابق")),
      R(tl("a foreign contractor", "un sous-traitant étranger", "متعاقد أجنبي"), tl("was off-site", "était à l'extérieur", "كان خارج الموقع"), tl("is suspected of leaks", "est soupçonné de fuites", "يُشتبه بتسريبه معلومات")),
      R(tl("the launch director", "la directrice du lancement", "مديرة الإطلاق"), tl("was in mission control", "était en salle de contrôle", "كانت في غرفة التحكم"), tl("staked her career on it", "y a misé toute sa carrière", "راهنت بمسيرتها عليه")),
      R(tl("a whistleblower technician", "un technicien lanceur d'alerte", "فني مبلّغ عن المخالفات"), tl("was on the floor", "était sur le plateau", "كان في القاعة"), tl("warned about safety cuts", "avait alerté sur les coupes de sécurité", "حذّر من خفض معايير السلامة")),
      R(tl("the budget officer", "le responsable du budget", "مسؤول الميزانية"), tl("was in meetings", "enchaînait les réunions", "كان في اجتماعات"), tl("hid the cost overruns", "a caché les dépassements", "أخفى تجاوزات التكاليف")),
    ],
    culprit: 4, herring: 1,
    motives: [
      tl("Career revenge", "Une revanche de carrière", "انتقام مهني"),
      tl("Corporate espionage", "L'espionnage industriel", "تجسس صناعي"),
      tl("Protecting a reputation", "Protéger une réputation", "حماية سمعة"),
      tl("Exposing a cover-up", "Révéler une dissimulation", "كشف تستر"),
      tl("Hiding fraud", "Cacher une fraude", "إخفاء احتيال"),
    ],
    weapons: [
      tl("Corrupted firmware", "Un micrologiciel corrompu", "برمجيات نظام معطوبة"),
      tl("A loosened coupling", "Un raccord desserré", "وصلة مُرخاة"),
      tl("Falsified test data", "Des données d'essai falsifiées", "بيانات اختبار مزوّرة"),
      tl("A cut sensor line", "Une ligne de capteur sectionnée", "سلك حساس مقطوع"),
    ],
    motiveIdx: 4, weaponIdx: 2,
    keyTime: tl("4:00 AM", "4 h 00", "4:00 فجرًا"),
    clue: tl("the control-room access log", "le journal d'accès de la salle de contrôle", "سجل دخول غرفة التحكم"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STORY-ARC chapter factory + two arcs
// ─────────────────────────────────────────────────────────────────────────────
interface ChapterPack {
  type: "investigation" | "interrogation" | "discovery" | "twist" | "final_reveal";
  crime: Crime;
  difficulty: Difficulty;
  title: L;
  storyText: L;
  cliffhanger: L;
  place: L;      // WITH preposition
  victimRole: L;
  suspects: [Role, Role, Role];
  culprit: 0 | 1 | 2;
  herring: 0 | 1 | 2;
  motives: L[];     // pick options — the true one is motives[motiveIdx]
  motiveIdx: number;
  clue: L;          // with article
  keyTime: L;       // may be non-clock ("Tonight") — templates use parentheses
}

const CHAPTER_WORD = tl("Chapter", "Chapitre", "الفصل");

function buildChapter(pack: ChapterPack, seasonId: string, n: number, availableDate: string) {
  const base = 2000 + n * 5;
  const victimName = nameAt(base);
  const sNames = [1, 2, 3].map((k) => nameAt(base + k));
  const culpritId = `suspect_${pack.culprit + 1}`;
  const cName = sNames[pack.culprit];
  const hName = sNames[pack.herring];
  const p = pack;
  const motive = p.motives[p.motiveIdx];
  return {
    kind: "chapter" as const,
    seasonId,
    chapterNumber: n,
    chapterType: p.type,
    title: p.title,
    description: make((l) => `${CHAPTER_WORD[l]} ${n}${l === "fr" ? " :" : l === "ar" ? ":" : ":"} ${p.storyText[l].slice(0, 90)}…`),
    storyText: p.storyText,
    cliffhanger: p.cliffhanger,
    type: p.crime,
    difficulty: p.difficulty,
    status: "active" as const,
    availableDate,
    estimatedMinutes: 8,
    maxScore: 1000,
    victim: {
      name: victimName,
      description: make((l) => `${cap(p.victimRole[l])}.`),
      avatar: "default_victim",
    },
    suspects: sNames.map((nm, i) => ({
      id: `suspect_${i + 1}`,
      name: nm,
      description: make((l) => `${nm[l]} — ${p.suspects[i].role[l]}.`),
      alibi: p.suspects[i].alibi,
      relationship: p.suspects[i].rel,
      avatar: "default_suspect",
    })),
    evidence: [
      {
        id: "ev_1",
        title: make((l) => cap(p.clue[l])),
        description: make((l) =>
          l === "fr" ? `${cap(p.clue.fr)} révèle ce qui s'est passé ${p.place.fr} (${p.keyTime.fr}).`
          : l === "ar" ? `${p.clue.ar} يكشف ما جرى ${p.place.ar} (${p.keyTime.ar}).`
          : `${cap(p.clue.en)} points to what happened ${p.place.en} (${p.keyTime.en}).`),
        type: "digital" as const,
        isRedHerring: false,
      },
      {
        id: "ev_2",
        title: tl("A Staged Trail", "Une piste fabriquée", "أثر مُفتعل"),
        description: make((l) =>
          l === "fr" ? `Les indices désignant ${hName.fr} ont été laissés avec un peu trop de soin.`
          : l === "ar" ? `الأدلة التي تشير إلى ${hName.ar} تُركت بعناية مريبة.`
          : `The evidence pointing at ${hName.en} was left too neatly.`),
        type: "physical" as const,
        isRedHerring: true,
      },
    ],
    witnessStatements: [
      {
        id: "w_1",
        witnessName: nameAt(base + 4),
        statement: make((l) =>
          l === "fr" ? `${cName.fr} se trouvait précisément là où, selon ses dires, il n'était pas.`
          : l === "ar" ? `كان ${cName.ar} في المكان الذي أنكر وجوده فيه بالضبط.`
          : `${cName.en} was exactly where they claimed not to be.`),
        reliability: "reliable" as const,
      },
    ],
    timeline: [
      {
        id: "t_1",
        time: tl("Earlier", "Plus tôt", "قبل ذلك"),
        description: make((l) =>
          l === "fr" ? `Le décor est en place ${p.place.fr}.`
          : l === "ar" ? `تتهيأ الأجواء ${p.place.ar}.`
          : `The stage is set ${p.place.en}.`),
        involvedSuspects: [],
      },
      {
        id: "t_2",
        time: p.keyTime,
        description: make((l) =>
          l === "fr" ? `${cName.fr} passe à l'acte — trahi par ${p.clue.fr}.`
          : l === "ar" ? `${cName.ar} ينفّذ خطته — ويفضحه ${p.clue.ar}.`
          : `${cName.en} acts — caught by ${p.clue.en}.`),
        involvedSuspects: [culpritId],
      },
      {
        id: "t_3",
        time: tl("After", "Ensuite", "بعد ذلك"),
        description: tl("The truth of this chapter surfaces.", "La vérité de ce chapitre éclate.", "تنكشف حقيقة هذا الفصل."),
        involvedSuspects: [],
      },
    ],
    megaOptions: { motives: p.motives, weapons: [] },
    solution: {
      suspectId: culpritId,
      motive,
      weapon: "",
      timelineEventId: "t_2",
      explanation: make((l) =>
        l === "fr" ? `Derrière ce chapitre : ${cName.fr}. ${cap(p.clue.fr)} ne laisse aucun doute. Mobile : ${lcf(motive.fr)}. La piste menant à ${hName.fr} avait été fabriquée.`
        : l === "ar" ? `وراء هذا الفصل: ${cName.ar}؛ إذ يفضح ${p.clue.ar} الحقيقة. الدافع: ${motive.ar}. أما الأثر المؤدي إلى ${hName.ar} فكان مدسوسًا.`
        : `${cName.en} is behind this chapter — ${p.clue.en} gives them away. Motive: ${lcf(motive.en)}. The trail toward ${hName.en} was planted.`),
    },
  };
}

interface Arc { title: L; subtitle: L; description: L; chapters: ChapterPack[] }

const ARC_1: Arc = {
  title: tl("The Shadow Syndicate", "Le Syndicat de l'ombre", "تنظيم الظل"),
  subtitle: tl("Season 1", "Saison 1", "الموسم الأول"),
  description: tl(
    "A flawless vault heist unravels into a city-wide conspiracy. Six chapters. One mastermind.",
    "Un casse de coffre parfait dégénère en conspiration à l'échelle de la ville. Six chapitres. Un seul cerveau.",
    "سرقة خزنة متقنة تتكشف عن مؤامرة تعم المدينة. ستة فصول. عقل مدبر واحد.",
  ),
  chapters: [
    {
      type: "investigation", crime: "theft", difficulty: "easy",
      title: tl("The Vanishing Vault", "Le coffre volatilisé", "الخزنة المتلاشية"),
      storyText: tl("The Meridian vault, untouched for forty years, is empty. No alarm, no forced entry — someone inside opened the door.", "Le coffre Meridian, intact depuis quarante ans, est vide. Pas d'alarme, pas d'effraction — quelqu'un de l'intérieur a ouvert la porte.", "خزنة ميريديان التي لم تُمس منذ أربعين عامًا فارغة. لا إنذار ولا اقتحام — أحدهم فتح الباب من الداخل."),
      cliffhanger: tl("An unidentified print on the dial matches no employee on record.", "Une empreinte inconnue sur le cadran ne correspond à aucun employé.", "بصمة مجهولة على قرص الخزنة لا تطابق أي موظف مسجّل."),
      place: tl("at the Meridian vault", "au coffre Meridian", "عند خزنة ميريديان"),
      victimRole: tl("a plundered private vault", "un coffre privé pillé", "خزنة خاصة منهوبة"),
      suspects: [
        R(tl("the night security supervisor", "la superviseuse de la sécurité de nuit", "مشرفة الأمن الليلي"), tl("was on rounds", "faisait sa ronde", "كانت في جولتها"), tl("holds a master override", "détient une clé de neutralisation générale", "تملك صلاحية التجاوز الكاملة")),
        R(tl("the aging locksmith", "le vieux serrurier", "صانع الأقفال المسن"), tl("claims to have been asleep", "prétend avoir dormi", "يدّعي أنه كان نائمًا"), tl("installed the vault", "a installé le coffre", "ركّب الخزنة")),
        R(tl("a junior auditor", "un auditeur débutant", "مدقق مبتدئ"), tl("left at nine", "est parti à neuf heures", "غادر في التاسعة"), tl("had the vault schedule", "connaissait le planning du coffre", "كان لديه جدول الخزنة")),
      ],
      culprit: 0, herring: 2,
      motives: [tl("A gambling debt", "Une dette de jeu", "دين قمار"), tl("Revenge for a demotion", "La vengeance d'une rétrogradation", "الانتقام لخفض رتبة"), tl("Blackmail by a stranger", "Le chantage d'un inconnu", "ابتزاز من شخص مجهول"), tl("Pure greed", "La pure cupidité", "الجشع الخالص")],
      motiveIdx: 2,
      clue: tl("the override log", "le journal des neutralisations", "سجل التجاوزات"),
      keyTime: tl("2:14 AM", "2 h 14", "2:14 فجرًا"),
    },
    {
      type: "interrogation", crime: "fraud", difficulty: "easy",
      title: tl("The Reluctant Witness", "Le témoin réticent", "الشاهدة المترددة"),
      storyText: tl("A bank clerk requests protection — she processed a suspicious transfer the same night. Then she recants.", "Une employée de banque demande protection — elle a traité un virement suspect la même nuit. Puis elle se rétracte.", "موظفة مصرف تطلب الحماية — فقد نفّذت تحويلًا مريبًا في الليلة نفسها. ثم تتراجع عن أقوالها."),
      cliffhanger: tl("She got a call from a blocked number minutes before changing her story.", "Elle a reçu un appel d'un numéro masqué quelques minutes avant de changer de version.", "تلقت مكالمة من رقم محجوب قبل دقائق من تغيير روايتها."),
      place: tl("at the bank", "à la banque", "في المصرف"),
      victimRole: tl("a threatened investigation", "une enquête menacée", "تحقيق مهدَّد"),
      suspects: [
        R(tl("her bank supervisor", "son supérieur à la banque", "مشرفها في المصرف"), tl("was in a meeting", "était en réunion", "كان في اجتماع"), tl("approved the transfer", "a validé le virement", "وافق على التحويل")),
        R(tl("the assigned detective", "l'inspecteur chargé du dossier", "المحقق المكلّف"), tl("was at the precinct", "était au commissariat", "كان في المخفر"), tl("had her address", "connaissait son adresse", "كان يعرف عنوانها")),
        R(tl("a frequent consultant", "un consultant régulier", "مستشار متردد على المصرف"), tl("claims to be abroad", "prétend être à l'étranger", "يدّعي أنه خارج البلاد"), tl("has unknown ties", "a des liens obscurs", "صلاته غامضة")),
      ],
      culprit: 0, herring: 2,
      motives: [tl("Protecting the money", "Protéger l'argent", "حماية المال"), tl("Fear for his family", "La peur pour sa famille", "الخوف على عائلته"), tl("A cut of the stolen bonds", "Une part des obligations volées", "حصة من السندات المسروقة"), tl("Old loyalty", "Une vieille loyauté", "ولاء قديم")],
      motiveIdx: 2,
      clue: tl("the call record", "le relevé d'appels", "سجل المكالمات"),
      keyTime: tl("4:58 PM", "16 h 58", "4:58 عصرًا"),
    },
    {
      type: "discovery", crime: "sabotage", difficulty: "medium",
      title: tl("Eyes in the Dark", "Des yeux dans le noir", "عيون في الظلام"),
      storyText: tl("A backup server holds the real vault footage. The team races to recover it before it's erased.", "Un serveur de sauvegarde contient les vraies images du coffre. L'équipe court pour les récupérer avant leur effacement.", "خادم احتياطي يحتفظ بتسجيلات الخزنة الحقيقية. يسابق الفريق الزمن لاستعادتها قبل محوها."),
      cliffhanger: tl("The file is corrupted at exactly the 2:14 AM mark.", "Le fichier est corrompu exactement à 2 h 14.", "الملف تالف عند لحظة 2:14 فجرًا بالضبط."),
      place: tl("in the backup server room", "dans la salle des serveurs de sauvegarde", "في غرفة الخوادم الاحتياطية"),
      victimRole: tl("the sabotaged footage", "des images sabotées", "تسجيلات مخرّبة"),
      suspects: [
        R(tl("the IT administrator", "l'administrateur informatique", "مدير تقنية المعلومات"), tl("was running backups", "lançait des sauvegardes", "كان يشغّل النسخ الاحتياطي"), tl("has full server access", "a un accès complet aux serveurs", "يملك وصولًا كاملًا للخوادم")),
        R(tl("a camera contractor", "un installateur de caméras", "متعاقد كاميرات"), tl("finished early", "a terminé en avance", "أنهى عمله باكرًا"), tl("had physical access", "avait un accès physique", "كان له وصول مادي")),
        R(tl("a data analyst", "un analyste de données", "محلل بيانات"), tl("never touched it", "n'y a jamais touché", "لم يقترب منه"), tl("requested the footage", "avait demandé les images", "طلب التسجيلات")),
      ],
      culprit: 0, herring: 1,
      motives: [tl("On the syndicate's payroll", "À la solde du syndicat", "على قائمة رواتب التنظيم"), tl("Hiding a mistake", "Cacher une erreur", "إخفاء خطأ"), tl("Coerced by threats", "Contraint par des menaces", "مُكره بالتهديد"), tl("Jealousy", "La jalousie", "الغيرة")],
      motiveIdx: 0,
      clue: tl("the deletion log", "le journal des suppressions", "سجل الحذف"),
      keyTime: tl("8:02 AM", "8 h 02", "8:02 صباحًا"),
    },
    {
      type: "twist", crime: "fraud", difficulty: "medium",
      title: tl("The Badge and the Bribe", "L'insigne et le pot-de-vin", "الشارة والرشوة"),
      storyText: tl("At every step, the syndicate stayed ahead. There's only one explanation — a cop is feeding them information.", "À chaque étape, le syndicat a gardé une longueur d'avance. Une seule explication : un policier les renseigne.", "في كل خطوة كان التنظيم متقدمًا بخطوة. تفسير واحد فقط — شرطي يسرّب لهم المعلومات."),
      cliffhanger: tl("A second name on the bribe ledger is redacted — someone far above.", "Un second nom du registre des pots-de-vin est caviardé — quelqu'un de bien plus haut placé.", "اسم ثانٍ في دفتر الرشاوى مطموس — شخص أعلى بكثير."),
      place: tl("at the precinct", "au commissariat", "في المخفر"),
      victimRole: tl("a corrupted department", "un service gangrené", "قسم شرطة نخره الفساد"),
      suspects: [
        R(tl("the lead detective", "l'inspectrice principale", "المحققة الرئيسية"), tl("followed every lead", "a suivi chaque piste", "تتبعت كل الخيوط"), tl("buried two reports", "a enterré deux rapports", "طمست تقريرين")),
        R(tl("the evidence sergeant", "le sergent des scellés", "رقيب حفظ الأدلة"), tl("claims clean logs", "affirme des registres impeccables", "يؤكد سلامة السجلات"), tl("controls the chain of custody", "contrôle la chaîne de conservation", "يتحكم بعهدة الأدلة")),
        R(tl("an eager rookie", "une jeune recrue zélée", "شرطي مستجد متحمس"), tl("just files paperwork", "ne fait que classer des dossiers", "لا يتجاوز عمله الأوراق"), tl("is new to the precinct", "vient d'arriver au commissariat", "جديد في المخفر")),
      ],
      culprit: 0, herring: 2,
      motives: [tl("Syndicate payoffs", "Les paiements du syndicat", "أموال التنظيم"), tl("Pressure from a superior", "La pression d'un supérieur", "ضغط من رئيس أعلى"), tl("Protecting a relative", "Protéger un proche", "حماية قريب"), tl("An old grudge", "Une vieille rancune", "ضغينة قديمة")],
      motiveIdx: 0,
      clue: tl("the bribe ledger", "le registre des pots-de-vin", "دفتر الرشاوى"),
      keyTime: tl("Week two", "La deuxième semaine", "الأسبوع الثاني"),
    },
    {
      type: "investigation", crime: "murder", difficulty: "hard",
      title: tl("The Missing Man", "L'homme disparu", "الرجل المفقود"),
      storyText: tl("The syndicate's accountant wanted a deal. They wanted his silence. They got it.", "Le comptable du syndicat voulait un accord. Eux voulaient son silence. Ils l'ont obtenu.", "محاسب التنظيم أراد صفقة مع العدالة. وهم أرادوا صمته. ونالوه."),
      cliffhanger: tl("His notebook is missing one page — and it names a traitor on the team.", "Il manque une page à son carnet — celle qui nomme un traître dans l'équipe.", "تنقص دفتره صفحة واحدة — وهي التي تكشف خائنًا داخل الفريق."),
      place: tl("at the safehouse", "dans la planque", "في المنزل الآمن"),
      victimRole: tl("a witness ready to testify", "un témoin prêt à parler", "شاهد كان مستعدًا للإدلاء بشهادته"),
      suspects: [
        R(tl("his task-force handler", "son agente de liaison", "ضابطة الاتصال المسؤولة عنه"), tl("was at the safehouse", "était à la planque", "كانت في المنزل الآمن"), tl("knew his location", "connaissait sa cachette", "كانت تعرف مكانه")),
        R(tl("a syndicate enforcer", "un homme de main du syndicat", "ذراع التنظيم الضاربة"), tl("was at a bar", "était dans un bar", "كان في حانة"), tl("is known for cleanups", "est connu pour faire le ménage", "معروف بتصفية الشهود")),
        R(tl("his estranged brother", "son frère avec qui il était brouillé", "أخوه المتخاصم معه"), tl("hadn't spoken to him in years", "ne lui parlait plus depuis des années", "لم يكلمه منذ سنوات"), tl("stood to inherit", "était l'héritier", "كان سيرث عنه")),
      ],
      culprit: 0, herring: 2,
      motives: [tl("Hiding her role as the mole", "Cacher son rôle de taupe", "إخفاء دورها كجاسوسة"), tl("A paid contract", "Un contrat payé", "عقد اغتيال مأجور"), tl("The inheritance", "L'héritage", "الميراث"), tl("Silencing a witness", "Faire taire un témoin", "إسكات شاهد")],
      motiveIdx: 0,
      clue: tl("the safehouse keycard", "le badge de la planque", "بطاقة المنزل الآمن"),
      keyTime: tl("4:40 AM", "4 h 40", "4:40 فجرًا"),
    },
    {
      type: "final_reveal", crime: "murder", difficulty: "expert",
      title: tl("The Mastermind", "Le cerveau", "العقل المدبر"),
      storyText: tl("The blackmail, the bribes, the dead accountant — all of it one mind hiding in plain sight. Tonight it gets a face.", "Le chantage, les pots-de-vin, le comptable mort — tout mène à un seul esprit caché au grand jour. Ce soir, il aura un visage.", "الابتزاز والرشاوى والمحاسب القتيل — كلها من تدبير عقل واحد يختبئ على مرأى من الجميع. الليلة يظهر وجهه."),
      cliffhanger: tl("Case closed — but the last page hints the network reaches one city over…", "Affaire classée — mais la dernière page suggère que le réseau s'étend à la ville voisine…", "أُغلقت القضية — لكن الصفحة الأخيرة تلمّح إلى أن الشبكة تمتد إلى المدينة المجاورة…"),
      place: tl("at police headquarters", "au quartier général de la police", "في مقر قيادة الشرطة"),
      victimRole: tl("a city held hostage", "une ville prise en otage", "مدينة رهينة"),
      suspects: [
        R(tl("the police commissioner", "le préfet de police", "مفوّض الشرطة"), tl("led the task force", "dirigeait la cellule d'enquête", "قاد فرقة التحقيق"), tl("oversaw every step", "supervisait chaque étape", "أشرف على كل خطوة")),
        R(tl("the exposed mole", "la taupe démasquée", "الجاسوسة المكشوفة"), tl("only took orders", "ne faisait qu'obéir", "كانت تنفذ الأوامر فقط"), tl("has already confessed", "a déjà avoué", "اعترفت بالفعل")),
        R(tl("the money consultant", "le consultant financier", "المستشار المالي"), tl("was just a middleman", "n'était qu'un intermédiaire", "مجرد وسيط"), tl("moves the funds", "fait circuler les fonds", "يحرّك الأموال")),
      ],
      culprit: 0, herring: 2,
      motives: [tl("A hidden empire", "Un empire caché", "إمبراطورية خفية"), tl("An old debt", "Une vieille dette", "دين قديم"), tl("Protecting a legacy", "Protéger un héritage", "حماية إرث"), tl("Greed", "La cupidité", "الجشع")],
      motiveIdx: 0,
      clue: tl("the torn notebook page", "la page arrachée du carnet", "صفحة الدفتر الممزقة"),
      keyTime: tl("Tonight", "Ce soir", "الليلة"),
    },
  ],
};

const ARC_2: Arc = {
  title: tl("The Harbor Conspiracy", "La conspiration du port", "مؤامرة الميناء"),
  subtitle: tl("Season 2", "Saison 2", "الموسم الثاني"),
  description: tl(
    "A drowned dockworker pulls the city's port authority into a web of smuggling, bribes, and betrayal. Six chapters to the tide's turn.",
    "Un docker noyé entraîne l'autorité portuaire dans une toile de contrebande, de pots-de-vin et de trahisons. Six chapitres avant que la marée tourne.",
    "عامل ميناء غريق يجرّ سلطة الميناء إلى شبكة من التهريب والرشى والخيانة. ستة فصول حتى ينقلب المدّ.",
  ),
  chapters: [
    {
      type: "investigation", crime: "murder", difficulty: "easy",
      title: tl("Body in the Bay", "Un corps dans la baie", "جثة في الخليج"),
      storyText: tl("A night-shift dockhand washes up at Pier 9. Ruled an accident — until the bruises don't match a fall.", "Un docker de nuit est retrouvé échoué au quai 9. Accident, conclut-on — jusqu'à ce que les ecchymoses ne collent pas avec une chute.", "يُعثر على عامل الوردية الليلية جثة عند الرصيف 9. قيل إنه حادث — إلى أن تبيّن أن الكدمات لا تطابق سقوطًا."),
      cliffhanger: tl("His logbook lists a container that officially never arrived.", "Son registre mentionne un conteneur qui, officiellement, n'est jamais arrivé.", "دفتره يذكر حاوية لم تصل رسميًا قط."),
      place: tl("at Pier 9", "au quai 9", "عند الرصيف 9"),
      victimRole: tl("a drowned dockworker", "un docker noyé", "عامل ميناء غريق"),
      suspects: [
        R(tl("the shift foreman", "le contremaître de nuit", "رئيس الوردية"), tl("was in the yard office", "était au bureau du dépôt", "كان في مكتب الساحة"), tl("signs every manifest", "signe chaque manifeste", "يوقّع كل بيانات الشحن")),
        R(tl("a fellow dockhand", "un autre docker", "زميل عامل"), tl("was loading a truck", "chargeait un camion", "كان يحمّل شاحنة"), tl("argued with the victim", "s'était disputé avec la victime", "تشاجر مع الضحية")),
        R(tl("the harbor patrol officer", "l'agent de la patrouille portuaire", "ضابط دورية الميناء"), tl("was out on the water", "était en mer", "كان في عرض الماء"), tl("was first on the scene", "est arrivé le premier", "أول من وصل إلى الموقع")),
      ],
      culprit: 0, herring: 1,
      motives: [tl("Silencing a witness", "Faire taire un témoin", "إسكات شاهد"), tl("A personal feud", "Une querelle personnelle", "خصومة شخصية"), tl("Covering a theft", "Couvrir un vol", "التغطية على سرقة"), tl("Fear of exposure", "La peur d'être découvert", "الخوف من الافتضاح")],
      motiveIdx: 0,
      clue: tl("the gate camera", "la caméra du portail", "كاميرا البوابة"),
      keyTime: tl("1:10 AM", "1 h 10", "1:10 فجرًا"),
    },
    {
      type: "discovery", crime: "theft", difficulty: "easy",
      title: tl("The Ghost Container", "Le conteneur fantôme", "الحاوية الشبح"),
      storyText: tl("The container that killed a man doesn't exist on paper. The team hunts it through the stacks before it ships out.", "Le conteneur qui a coûté une vie n'existe sur aucun document. L'équipe le traque dans les allées avant qu'il ne reparte.", "الحاوية التي تسببت بمقتل رجل لا وجود لها على الورق. يطاردها الفريق بين الأرصفة قبل شحنها."),
      cliffhanger: tl("Its seal number belongs to a company dissolved a decade ago.", "Son numéro de scellé appartient à une société dissoute il y a dix ans.", "رقم ختمها يعود لشركة حُلّت قبل عقد."),
      place: tl("in the container yard", "dans le parc à conteneurs", "في ساحة الحاويات"),
      victimRole: tl("a missing shipment", "une cargaison disparue", "شحنة مفقودة"),
      suspects: [
        R(tl("the yard crane operator", "le grutier du parc", "مشغّل رافعة الساحة"), tl("was on a break", "était en pause", "كان في استراحة"), tl("moves every box", "déplace chaque caisse", "ينقل كل الصناديق")),
        R(tl("a customs clerk", "un commis des douanes", "كاتب جمارك"), tl("was at lunch", "déjeunait", "كان في استراحة الغداء"), tl("clears the paperwork", "valide les documents", "يجيز الأوراق")),
        R(tl("a freight broker", "un courtier en fret", "سمسار شحن"), tl("was off-site", "était à l'extérieur", "كان خارج الموقع"), tl("booked the slot", "a réservé le créneau", "حجز موعد الشحن")),
      ],
      culprit: 1, herring: 0,
      motives: [tl("A bribe", "Un pot-de-vin", "رشوة"), tl("Blackmail", "Un chantage", "ابتزاز"), tl("A cut of the cargo", "Une part de la cargaison", "حصة من الشحنة"), tl("Loyalty to the ring", "La loyauté envers le réseau", "الولاء للعصابة")],
      motiveIdx: 0,
      clue: tl("the customs override", "la dérogation douanière", "تجاوز الجمارك"),
      keyTime: tl("6:20 AM", "6 h 20", "6:20 صباحًا"),
    },
    {
      type: "interrogation", crime: "fraud", difficulty: "medium",
      title: tl("The Paper Tide", "La marée de papier", "مدّ الأوراق"),
      storyText: tl("The smuggling runs on forged manifests. One official's signature is on all of them — but they swear they never signed.", "La contrebande repose sur des manifestes falsifiés. La signature d'un même responsable figure partout — mais il jure n'avoir rien signé.", "التهريب يقوم على بيانات شحن مزوّرة. توقيع مسؤول واحد يظهر عليها كلها — لكنه يقسم أنه لم يوقّع."),
      cliffhanger: tl("The signatures are real. The official's stamp was used while they were overseas.", "Les signatures sont authentiques. Le tampon a servi pendant que le responsable était à l'étranger.", "التوقيعات حقيقية. فقد استُخدم الختم بينما كان المسؤول خارج البلاد."),
      place: tl("at the port authority office", "aux bureaux de l'autorité portuaire", "في مكتب سلطة الميناء"),
      victimRole: tl("a falsified ledger", "un registre falsifié", "سجل مزوّر"),
      suspects: [
        R(tl("the deputy port director", "le directeur adjoint du port", "نائب مدير الميناء"), tl("was traveling", "était en déplacement", "كان مسافرًا"), tl("owns the stamp", "est le titulaire du tampon", "صاحب الختم")),
        R(tl("an office administrator", "une administratrice du bureau", "موظفة إدارية"), tl("was at her desk", "était à son poste", "كانت في مكتبها"), tl("keeps the stamp", "garde le tampon", "تحتفظ بالختم")),
        R(tl("an IT auditor", "un auditeur informatique", "مدقق أنظمة"), tl("was patching systems", "mettait à jour les systèmes", "كان يحدّث الأنظمة"), tl("can backdate records", "peut antidater des documents", "يستطيع تغيير تواريخ السجلات")),
      ],
      culprit: 1, herring: 0,
      motives: [tl("On the ring's payroll", "À la solde du réseau", "على رواتب العصابة"), tl("Coerced", "Sous la contrainte", "مُكرهة بالتهديد"), tl("Skimming fees", "Détourner des commissions", "اقتطاع رسوم خلسة"), tl("Protecting a boss", "Protéger un patron", "حماية رئيسها")],
      motiveIdx: 0,
      clue: tl("the stamp-room badge log", "le journal d'accès à la salle du tampon", "سجل دخول غرفة الختم"),
      keyTime: tl("3:40 PM", "15 h 40", "3:40 عصرًا"),
    },
    {
      type: "twist", crime: "sabotage", difficulty: "medium",
      title: tl("The Drowned Evidence", "Les preuves noyées", "الأدلة الغارقة"),
      storyText: tl("The seized manifests are the whole case. Overnight, a sprinkler 'malfunction' soaks the evidence locker.", "Les manifestes saisis sont tout le dossier. Dans la nuit, une « panne » de sprinkler inonde le local des scellés.", "بيانات الشحن المصادرة هي القضية كلها. وفي الليل، «عطل» في مرشات الحريق يغرق خزانة الأدلة."),
      cliffhanger: tl("The sprinkler was triggered manually — by someone with a case-team key.", "Le sprinkler a été déclenché manuellement — par quelqu'un possédant une clé de l'équipe d'enquête.", "المرشّ أُطلق يدويًا — بيد شخص يملك مفتاح فريق التحقيق."),
      place: tl("at the evidence dock", "au local des scellés", "في مستودع الأدلة"),
      victimRole: tl("the sabotaged proof", "des preuves sabotées", "أدلة مُتلفة عمدًا"),
      suspects: [
        R(tl("the evidence clerk", "la greffière des scellés", "أمينة الأدلة"), tl("had gone home", "était rentrée chez elle", "كانت قد عادت إلى منزلها"), tl("controls the locker", "contrôle le local", "تتحكم بالخزانة")),
        R(tl("a task-force officer", "un officier de la cellule", "ضابط في فرقة التحقيق"), tl("was on patrol", "était en patrouille", "كان في دورية"), tl("wanted the case dropped", "voulait l'abandon du dossier", "أراد إسقاط القضية")),
        R(tl("a building engineer", "un technicien du bâtiment", "مهندس صيانة المبنى"), tl("was fixing the boiler", "réparait la chaudière", "كان يصلح المرجل"), tl("knows the sprinkler panel", "connaît le tableau des sprinklers", "يعرف لوحة المرشات")),
      ],
      culprit: 1, herring: 2,
      motives: [tl("A payoff", "Un paiement", "أموال مقابل الخدمة"), tl("Fear of being named", "La peur d'être cité", "الخوف من ذكر اسمه"), tl("A grudge", "Une rancune", "ضغينة"), tl("Following orders", "L'exécution d'ordres", "تنفيذ أوامر")],
      motiveIdx: 0,
      clue: tl("the sprinkler panel log", "le journal du tableau des sprinklers", "سجل لوحة المرشات"),
      keyTime: tl("2:50 AM", "2 h 50", "2:50 فجرًا"),
    },
    {
      type: "investigation", crime: "disappearance", difficulty: "hard",
      title: tl("The Vanished Informant", "L'informateur volatilisé", "المخبر المختفي"),
      storyText: tl("A dockworker agrees to name the ring's boss. Before dawn, his motel room is empty and his phone is in the harbor.", "Un docker accepte de nommer le chef du réseau. Avant l'aube, sa chambre de motel est vide et son téléphone est dans le port.", "عامل ميناء يوافق على كشف اسم زعيم العصابة. وقبل الفجر، غرفته في النُّزل فارغة وهاتفه في مياه الميناء."),
      cliffhanger: tl("The room key was last used by a badge, not a guest.", "La clé de la chambre a été utilisée en dernier par un badge de service, pas par un client.", "آخر من استخدم مفتاح الغرفة كان يحمل شارة رسمية، لا نزيلًا."),
      place: tl("at a waterfront motel", "dans un motel du front de mer", "في نُزل على الواجهة البحرية"),
      victimRole: tl("a smuggling informant", "un informateur sur la contrebande", "مخبر عن التهريب"),
      suspects: [
        R(tl("his police handler", "son agent traitant", "ضابط الاتصال المسؤول عنه"), tl("was at the station", "était au poste", "كان في المركز"), tl("arranged the meeting", "a organisé le rendez-vous", "رتّب اللقاء")),
        R(tl("a ring enforcer", "un homme de main du réseau", "منفّذ العصابة"), tl("was seen downtown", "a été vu en centre-ville", "شوهد وسط المدينة"), tl("hunts down leaks", "traque les fuites", "يطارد المسرّبين")),
        R(tl("the motel manager", "le gérant du motel", "مدير النُّزل"), tl("was at the desk", "était à la réception", "كان عند مكتب الاستقبال"), tl("keeps the master key", "garde le passe-partout", "يحتفظ بالمفتاح الرئيسي")),
      ],
      culprit: 0, herring: 1,
      motives: [tl("Protecting the boss", "Protéger le chef", "حماية الزعيم"), tl("A paid contract", "Un contrat payé", "عقد مأجور"), tl("Self-preservation", "L'instinct de survie", "النجاة بنفسه"), tl("A bribe", "Un pot-de-vin", "رشوة")],
      motiveIdx: 0,
      clue: tl("the keycard log", "le journal des badges", "سجل بطاقات الدخول"),
      keyTime: tl("5:05 AM", "5 h 05", "5:05 فجرًا"),
    },
    {
      type: "final_reveal", crime: "murder", difficulty: "expert",
      title: tl("The Harbormaster", "Le capitaine du port", "سيد الميناء"),
      storyText: tl("Every forged manifest, every bribe, every body — routed through one office with a view of the whole harbor. Tonight the tide goes out on them.", "Chaque manifeste falsifié, chaque pot-de-vin, chaque mort — tout passe par un seul bureau avec vue sur tout le port. Ce soir, la marée se retire pour son occupant.", "كل بيان مزوّر وكل رشوة وكل جثة — مرّت عبر مكتب واحد يطل على الميناء كله. الليلة ينحسر المد عن صاحبه."),
      cliffhanger: tl("The ring is broken — but a wire transfer flags a sister port up the coast…", "Le réseau est démantelé — mais un virement signale un port jumeau plus haut sur la côte…", "فُككت العصابة — لكن حوالة مالية تشير إلى ميناء شقيق على الساحل…"),
      place: tl("in the harbormaster's tower", "dans la tour du capitaine du port", "في برج سيد الميناء"),
      victimRole: tl("a port strangled by one hand", "un port étranglé par une seule main", "ميناء تخنقه يد واحدة"),
      suspects: [
        R(tl("the harbormaster", "le capitaine du port", "سيد الميناء"), tl("was 'reviewing the tides'", "« étudiait les marées »", "كان «يراجع حركة المد»"), tl("oversees the entire port", "supervise tout le port", "يشرف على الميناء كله")),
        R(tl("the deputy director", "le directeur adjoint", "نائب المدير"), tl("cooperated fully", "a pleinement coopéré", "تعاون تعاونًا كاملًا"), tl("took the earlier fall", "a porté le chapeau la première fois", "تحمّل اللوم سابقًا")),
        R(tl("the freight broker", "le courtier en fret", "سمسار الشحن"), tl("was just a vendor", "n'était qu'un prestataire", "مجرد مورّد"), tl("moved the money", "faisait circuler l'argent", "حرّك الأموال")),
      ],
      culprit: 0, herring: 1,
      motives: [tl("A smuggling empire", "Un empire de contrebande", "إمبراطورية تهريب"), tl("An old debt", "Une vieille dette", "دين قديم"), tl("Protecting a dynasty", "Protéger une dynastie", "حماية سلالة نفوذ"), tl("Greed", "La cupidité", "الجشع")],
      motiveIdx: 0,
      clue: tl("the master control log", "le journal du poste de contrôle central", "سجل وحدة التحكم الرئيسية"),
      keyTime: tl("Midnight", "Minuit", "منتصف الليل"),
    },
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
const WEEK_WORD = tl("Week", "Semaine", "الأسبوع");

async function run() {
  await connectDatabase();
  const db = mongoose.connection.db!;
  logger.info(`Launch content: anchoring calendar to ${ymd(TODAY)} for ${TOTAL_DAYS} days (trilingual en/fr/ar).`);

  // ── 1. Reset the existing content calendar (pre-launch clean slate) ──
  const delCases = await Case.deleteMany({ kind: { $in: ["daily", "mini", "mega", "chapter"] } });
  const delEvents = await Event.deleteMany({});
  const delSeasons = await Season.deleteMany({});
  // Clear now-dangling progress so leaderboards/participation aren't orphaned.
  await db.collection("eventparticipations").deleteMany({}).catch(() => {});
  await db.collection("seasonprogresses").deleteMany({}).catch(() => {});
  logger.info(`Reset: removed ${delCases.deletedCount} cases, ${delEvents.deletedCount} events, ${delSeasons.deletedCount} seasons.`);

  const docs: any[] = [];

  // ── 2. Daily cases: one per day, rotating packs/difficulty/names. ──
  const dailyDifficultyCycle: Difficulty[] = ["medium", "hard", "medium", "expert", "hard", "easy", "medium", "hard"];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const pack = DAILY_PACKS[i % DAILY_PACKS.length];
    const diff = dailyDifficultyCycle[i % dailyDifficultyCycle.length];
    docs.push(buildDaily(pack, ymd(dayDate(i)), diff, i));
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
      title: make((l) => `${built.title[l]} — ${WEEK_WORD[l]} ${w + 1}`),
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
    logger.info(`Created season "${arc.title.en}" (${status}) with ${arc.chapters.length} chapters.`);
  }

  // ── Summary ──
  logger.info("──────────────────────────────────────────────");
  logger.info(`DONE. Daily=${dailyCount}, Mini=${miniCount}, Mega=${megaCount}, Seasons=2 (${chapterCount} chapters) — every text field stored as { en, fr, ar }.`);
  logger.info(`First daily case date: ${ymd(dayDate(0))}  |  Last: ${ymd(dayDate(TOTAL_DAYS - 1))}`);
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  run().catch((err) => {
    logger.error("Launch content seed failed:", err);
    process.exit(1);
  });
}

// Exported for sanity tests (building docs needs no DB connection).
export { buildDaily, buildMini, buildMega, buildChapter, DAILY_PACKS, MINI_PACKS, MEGA_PACKS, ARC_1, ARC_2, TOTAL_DAYS };
