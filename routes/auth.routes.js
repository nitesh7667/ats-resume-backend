import express from "express";
import { register, login, logout, getMe } from "../controller/user.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
const AuthRouter = express.Router();

AuthRouter.post("/register", register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", logout);
AuthRouter.get("/me", userMiddleware, getMe);

export default AuthRouter;