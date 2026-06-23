import { Router } from "express";
import { testPushController } from "./notifications.controller";

export const notificationsRouter = Router();

// GET so it can be triggered straight from a phone browser; POST for tooling.
notificationsRouter.get("/test", testPushController);
notificationsRouter.post("/test", testPushController);
