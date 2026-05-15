import express from "express";
import {
  registerUser,
  loginUser,
  refreshTokenUser,
  logoutUser,
} from "../controllers/auth-controller.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refreshToken", refreshTokenUser);

router.post("/logout", logoutUser);

export default router;
