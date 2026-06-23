import { Router } from "express";
import { ssvController } from "./ads.controller";

export const adsRouter = Router();

// Public — AdMob's servers call this. Authenticated by the signed payload, not
// by our JWT. AdMob sends a GET request.
adsRouter.get("/ssv", ssvController);
