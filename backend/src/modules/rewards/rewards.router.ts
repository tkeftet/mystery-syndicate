import { Router } from "express";
import { authenticate } from "../auth";
import {
  getShopController,
  purchaseController,
  equipController,
} from "./rewards.controller";

export const rewardsRouter = Router();

rewardsRouter.use(authenticate);

rewardsRouter.get("/shop", getShopController);
rewardsRouter.post("/purchase", purchaseController);
rewardsRouter.post("/equip", equipController);
