import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  guestController,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/guest", guestController);
