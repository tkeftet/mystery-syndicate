import { Router } from "express";
import { authenticate } from "../auth";
import {
  listController,
  claimController,
  claimAllController,
} from "./challenges.controller";

export const challengesRouter = Router();

challengesRouter.use(authenticate);

challengesRouter.get("/", listController);
challengesRouter.post("/claim", claimController);
challengesRouter.post("/claim-all", claimAllController);
