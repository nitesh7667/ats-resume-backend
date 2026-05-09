import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import AuthRouter from "./routes/auth.routes.js";
import ResumeRouter from "./routes/resume.routes.js";
import CodeRouter from "./routes/code.routes.js";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
)
app.use(express.json());
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
    console.log(`--> ${req.method} ${req.url}`);
    next();
});

connectDB();

app.use("/api/auth", AuthRouter);
app.use("/api/resume", ResumeRouter);
app.use("/api/code", CodeRouter);

app.get("/", (req, res) => {
    res.send("Hello World!");
}); 

app.listen(5000, () => {
    console.log("Server is running on port 5000");
}); 