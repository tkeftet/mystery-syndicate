import { Router } from "express";
import { authenticate } from "../auth";
import {
  sendRequestController,
  acceptController,
  rejectController,
  cancelController,
  removeController,
  blockController,
  unblockController,
  listFriendsController,
  listRequestsController,
  searchController,
  getPrivacyController,
  updatePrivacyController,
  heartbeatController,
} from "./friends.controller";

export const friendsRouter = Router();

friendsRouter.use(authenticate);

friendsRouter.get("/", listFriendsController);
friendsRouter.get("/requests", listRequestsController);
friendsRouter.get("/search", searchController);
friendsRouter.get("/privacy", getPrivacyController);
friendsRouter.put("/privacy", updatePrivacyController);
friendsRouter.post("/heartbeat", heartbeatController);

friendsRouter.post("/request", sendRequestController);
friendsRouter.post("/accept", acceptController);
friendsRouter.post("/reject", rejectController);
friendsRouter.post("/cancel", cancelController);
friendsRouter.post("/remove", removeController);
friendsRouter.post("/block", blockController);
friendsRouter.post("/unblock", unblockController);
