import { Router } from "express";
import { authenticate } from "../auth";
import {
  getTodayCaseController,
  getTodayMinisController,
  getCaseByIdController,
  getRecentCasesController,
} from "./cases.controller";

export const casesRouter = Router();

casesRouter.use(authenticate);

casesRouter.get("/today", getTodayCaseController);
casesRouter.get("/mini", getTodayMinisController);
casesRouter.get("/recent", getRecentCasesController);
casesRouter.get("/:id", getCaseByIdController);
