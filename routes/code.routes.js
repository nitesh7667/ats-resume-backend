import express from "express";
import { generateCode } from "../controller/code.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js"; // Ensuring they are logged in

const router = express.Router();

router.post("/generate", userMiddleware, generateCode);

export default router;
