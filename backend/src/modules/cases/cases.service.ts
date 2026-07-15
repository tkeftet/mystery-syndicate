import { Case } from "./case.model";
import { Investigation } from "../investigations/investigation.model";
import { NotFoundError } from "../../shared/errors/AppError";
import { type Lang, localizeCase, localizeCases } from "../../shared/localized";

export async function getTodayCase(lang: Lang) {
  const today = new Date().toISOString().split("T")[0];
  // only the standalone daily case (exclude mega/chapter/mini)
  const base = { status: "active", kind: { $nin: ["mega", "chapter", "mini"] } };

  // Safety net: a content-runway gap must NOT break the core daily loop. If
  // today has no case, fall back to the most recent already-published daily
  // case so players always have something to play. Returns null only if no
  // daily content exists at all (the UI shows a graceful "no case" state).
  const todayCase =
    (await Case.findOne({ ...base, availableDate: today })
      .select("-solution")
      .lean()) ??
    (await Case.findOne({ ...base, availableDate: { $lte: today } })
      .sort({ availableDate: -1 })
      .select("-solution")
      .lean());

  return todayCase ? localizeCase(todayCase, lang) : null;
}

/** Today's quick Mini Cases (1-2 min). Several may be available per day. */
export async function getTodayMinis(lang: Lang) {
  const today = new Date().toISOString().split("T")[0];
  const minis = await Case.find({
    kind: "mini",
    availableDate: today,
    status: "active",
  })
    .select("-solution")
    .lean();
  return localizeCases(minis, lang);
}

export async function getCaseById(caseId: string, lang: Lang) {
  const case_ = await Case.findById(caseId).select("-solution").lean();
  if (!case_) throw new NotFoundError("Case");
  return localizeCase(case_, lang);
}

export async function getRecentCases(userId: string, lang: Lang, limit = 10) {
  const today = new Date().toISOString().split("T")[0];

  const cases = await Case.find({
    availableDate: { $lt: today },
    status: { $in: ["active", "archived"] },
    kind: { $nin: ["mega", "chapter", "mini"] }, // standalone daily cases only
  })
    .select("-solution")
    .sort({ availableDate: -1 })
    .limit(limit)
    .lean();

  const caseIds = cases.map((c) => String(c._id));

  const investigations = await Investigation.find({
    userId,
    caseId: { $in: caseIds },
    status: "completed",
  }).select("caseId isCorrect score");

  const invMap = new Map(investigations.map((inv) => [inv.caseId, inv]));

  return cases.map((c) => {
    const inv = invMap.get(String(c._id));
    return {
      ...localizeCase(c, lang),
      investigationStatus: inv
        ? inv.isCorrect
          ? "correct"
          : "wrong"
        : "unsolved",
      score: inv?.score ?? null,
    };
  });
}
