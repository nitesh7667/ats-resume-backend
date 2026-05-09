import jwt from "jsonwebtoken";
import User from "../model/auth.js";
import BlacklistToken from "../model/blacklist.model.js";

export const userMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const isBlacklisted = await BlacklistToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: "Unauthorized, Token Blacklisted" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_super_secret_key");
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("Error in user middleware:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};  