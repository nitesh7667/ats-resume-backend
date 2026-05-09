import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { analyzeResume, getHistory } from "../controller/resume.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

const router = express.Router();

// Ensure uploads directory exists setup
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer disk storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Generating a unique ID for the file name 
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Setting upload config and limiting strictly to PDFs
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("File format not supported. Only PDF files are allowed!"), false);
        }
    }
});

// ATS Resume routes
router.post("/analyze", userMiddleware, upload.single("resume"), analyzeResume);
router.get("/history", userMiddleware, getHistory);

export default router;
