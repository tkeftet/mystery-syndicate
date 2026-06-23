import { Router } from "express";
import { authenticate } from "../auth";
import {
  customizationController,
  equipController,
  likeController,
  analyticsController,
} from "./cosmetics.controller";

export const cosmeticsRouter = Router();

cosmeticsRouter.use(authenticate);

cosmeticsRouter.get("/", customizationController);
cosmeticsRouter.post("/equip", equipController);
cosmeticsRouter.post("/like/:userId", likeController);
cosmeticsRouter.get("/analytics", analyticsController);
