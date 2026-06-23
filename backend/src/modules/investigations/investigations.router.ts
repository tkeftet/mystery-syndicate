import { Router } from "express";
import { authenticate } from "../auth";
import {
  startController,
  submitAccusationController,
  getInvestigationController,
  useHintController,
  syncProgressController,
} from "./investigations.controller";

export const investigationsRouter = Router();

investigationsRouter.use(authenticate);

investigationsRouter.post("/:caseId/start", startController);
investigationsRouter.get("/:caseId", getInvestigationController);
investigationsRouter.post("/:caseId/accuse", submitAccusationController);
investigationsRouter.post("/:caseId/hint", useHintController);
investigationsRouter.patch("/:caseId/progress", syncProgressController);

// NOTE: rewarded-ad rewards (eliminate suspect / reveal red herring / double
// reward) are NOT exposed as client-callable routes. They are granted only by
// the AdMob server-side-verification callback — see modules/ads. The grant
// logic lives in investigations.service (adEliminateSuspect, adRevealRedHerring,
// claimDoubleReward) and is invoked from the verified SSV handler.
