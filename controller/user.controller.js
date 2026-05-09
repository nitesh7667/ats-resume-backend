import user from "../model/auth.js";
import jwt from "jsonwebtoken";
import BlacklistToken from "../model/blacklist.model.js";

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "User  already exists" });
        }
        const newUser = await user.create({ name, email, password });
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await user.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        const isPasswordValid = await existingUser.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: "Invalid password" });
        }

        const token = jwt.sign(
            { id: existingUser._id, email: existingUser.email },
            process.env.JWT_SECRET || "default_super_secret_key",
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({ success: true, token, data: existingUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (token) {
            await BlacklistToken.create({ token });
        }
        res.clearCookie("token");
        res.status(200).json({ success: true, data: "User logged out" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}; 


export const getMe = async (req, res) => {
    try {
        const currentUser = await user.findById(req.user.id);
        res.status(200).json({ success: true, data: currentUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


