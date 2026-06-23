import { Router } from "express";
import { authenticate } from "../auth";
import * as c from "./agencies.controller";

export const agenciesRouter = Router();

agenciesRouter.use(authenticate);

agenciesRouter.get("/", c.listController);
agenciesRouter.post("/", c.createController);
agenciesRouter.get("/me", c.myAgencyController);
agenciesRouter.get("/leaderboard", c.leaderboardController);
agenciesRouter.get("/requests", c.requestsController);
agenciesRouter.post("/leave", c.leaveController);
agenciesRouter.post("/delete", c.deleteController);
agenciesRouter.post("/requests/approve", c.approveController);
agenciesRouter.post("/requests/reject", c.rejectController);
agenciesRouter.post("/members/role", c.setRoleController);
agenciesRouter.post("/members/kick", c.kickController);
agenciesRouter.post("/members/transfer", c.transferController);
agenciesRouter.get("/:id", c.getAgencyController);
agenciesRouter.post("/:id/join", c.joinController);
