import { Router } from "express";
import { authenticate } from "../auth";
import {
  startController,
  submitAccusationController,
  getInvestigationController,
  useHintController,
  adRewardController,
  syncProgressController,
} from "./investigations.controller";

export const investigationsRouter = Router();

investigationsRouter.use(authenticate);

investigationsRouter.post("/:caseId/start", startController);
investigationsRouter.get("/:caseId", getInvestigationController);
investigationsRouter.post("/:caseId/accuse", submitAccusationController);
investigationsRouter.post("/:caseId/hint", useHintController);
investigationsRouter.patch("/:caseId/progress", syncProgressController);

// Rewarded-ad helps (eliminate suspect / reveal red herring / double reward)
// are redeemed here, authenticated, right after the ad's onRewarded fires — so
// the reward applies instantly instead of waiting on AdMob's async SSV callback.
// The suspect/red-herring choice stays server-side (the solution is never sent
// to the client) and each reward keeps its own guard, so this can't trivialize a
// case. The AdMob SSV callback (modules/ads) remains for account-scoped rewards
// like streak-save; investigation ads no longer send SSV custom_data.
investigationsRouter.post("/:caseId/ad-reward", adRewardController);
