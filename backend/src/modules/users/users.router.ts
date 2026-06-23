import { Router } from "express";
import { authenticate } from "../auth";
import {
  getMyProfileController,
  getMyHistoryController,
  getPublicProfileController,
  updatePushTokenController,
} from "./users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/me", getMyProfileController);
usersRouter.get("/me/history", getMyHistoryController);
usersRouter.post("/me/push-token", updatePushTokenController);
usersRouter.get("/:userId/public", getPublicProfileController);
