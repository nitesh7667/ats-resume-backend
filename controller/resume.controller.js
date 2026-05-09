import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";

import Resume from "../model/resume.model.js";
import { aiContextRules } from "../tem.js"; // Importing the intention/questions rules

// ─── API Key Rotation ────────────────────────────────────────────────────────
// Add API_KEY_1, API_KEY_2, API_KEY_3 ... to your .env file.
// The system will automatically cycle through them when one hits a rate limit.
const getApiKeys = () => {
  const keys = [
    process.env.API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
  ].filter(Boolean); // Remove undefined / empty entries
  if (keys.length === 0) throw new Error("No Gemini API keys configured in .env!");
  return keys;
};

// Try each API key one-by-one; rotate on 429 (quota) or 503 (overload)
const generateWithKeyRotation = async (modelConfig, prompt) => {
  const keys = getApiKeys();
  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`🔑 Trying API key ${i + 1}/${keys.length}...`);
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel(modelConfig);
      const result = await model.generateContent(prompt);
      console.log(`✅ API key ${i + 1} succeeded.`);
      return result;
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.toLowerCase().includes("quota") || err?.message?.toLowerCase().includes("rate limit");
      const isOverload  = err?.status === 503 || err?.message?.toLowerCase().includes("high demand") || err?.message?.toLowerCase().includes("overload");
      if (isRateLimit || isOverload) {
        console.warn(`⚠️  Key ${i + 1} hit limit/overload — trying next key...`);
        lastError = err;
        continue; // try next key
      }
      throw err; // non-rate-limit error → rethrow immediately
    }
  }
  throw lastError; // all keys exhausted
};

// Define Zod Schema natively
const atsResultSchema = z.object({
  atsScore: z
    .number()
    .describe("Strict match percentage. Be harsh, max 85-90 unless perfect."),
  missingKeywords: z.array(z.string()),
  matchedKeywords: z.array(z.string()),
  spellingAndGrammarIssues: z
    .array(z.string())
    .describe("List of exact typos or grammatical errors found"),
  formattingIssues: z
    .array(z.string())
    .describe("Structural flaws or formatting improvements point-by-point"),
  projectSuggestions: z
    .array(z.string())
    .describe(
      "Specific, industry-relevant projects or qualifications needed to become job-ready",
    ),
  aiFeedback: z
    .string()
    .describe(
      "Overall brutal but constructive paragraph on industry readiness",
    ),
});

export const analyzeResume = async (req, res) => {
  console.log("\n🚀 [NEW REQUEST] Starting Resume Analysis...");

  try {
    const { selfDescription, jobDescription } = req.body;
    console.log("📝 Job Desk Length:", jobDescription?.length || 0);
    console.log("📎 File Uploaded:", req.file ? req.file.originalname : "None");

    // 1. Validation
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Please upload a resume file (PDF)." });
    }
    if (!jobDescription) {
      return res.status(400).json({ message: "Job description is required." });
    }

    // 2. Read PDF
    let dataBuffer;
    try {
      dataBuffer = fs.readFileSync(req.file.path);
    } catch (fileErr) {
      console.error("Failed to read file", fileErr);
      return res
        .status(500)
        .json({ message: "Internal error reading the uploaded file." });
    }

    let resumeText = "";
    try {
      const data = await pdfParse(dataBuffer);
      resumeText = data.text;
    } catch (pdfError) {
      console.error("PDF Parsing Error:", pdfError);
      return res.status(400).json({
        message:
          "Could not read this PDF. Please ensure it is not encrypted or corrupted.",
      });
    }

    // 3. Define the Gemini model config (shared across all key attempts)
    const modelConfig = {
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            atsScore: {
              type: SchemaType.NUMBER,
              description: "Strict match percentage number 0 to 100",
            },
            missingKeywords: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            matchedKeywords: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            spellingAndGrammarIssues: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            formattingIssues: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            projectSuggestions: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            aiFeedback: { type: SchemaType.STRING },
          },
          required: [
            "atsScore",
            "missingKeywords",
            "matchedKeywords",
            "spellingAndGrammarIssues",
            "formattingIssues",
            "projectSuggestions",
            "aiFeedback",
          ],
        },
      },
    };

    // 4. Construct the final Prompt using tem.js context
    const prompt = `
            == INSTRUCTIONS & AI INTENTION ==
            Mission: ${aiContextRules.intention}
            FAQ - ${aiContextRules.question} => ${aiContextRules.answer}
            
            Always provide a default structure, even if the job description is short.
            
            == TARGET JOB DESCRIPTION ==
            ${jobDescription}

            == CANDIDATE SELF DESCRIPTION ==
            ${selfDescription || "Not provided."}

            == CANDIDATE RESUME TEXT ==
            ${resumeText.substring(0, 30000)}
        `;

    // 5. Execute AI Generation with automatic key rotation on rate-limit
    let result;
    try {
      result = await generateWithKeyRotation(modelConfig, prompt);
    } catch (aiError) {
      console.error("❌ All API keys exhausted or unexpected error:", aiError?.message);
      const isLimit = aiError?.status === 429 || aiError?.message?.toLowerCase().includes("quota");
      const isOverload = aiError?.status === 503 || aiError?.message?.toLowerCase().includes("high demand");
      return res.status(503).json({
        message: isLimit
          ? "All API keys have reached their rate limit. Please add more keys or wait."
          : isOverload
          ? "The AI model is overloaded. Please try again in a few seconds."
          : `AI generation failed: ${aiError?.message || "Unknown error"}`,
      });
    }
    const responseText = result.response.text();

    // 7. Parse & Validate Output rigidly with Zod
    let aiResult;
    try {
      const cleanText = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsedJson = JSON.parse(cleanText);

      // Re-validate against our strict Zod schema here
      aiResult = atsResultSchema.parse(parsedJson);

      console.log("\n✅ AI ANALYSIS SUCCESSFUL! HERE IS THE JSON RESULT:");
      console.log(JSON.stringify(aiResult, null, 2));
      console.log("--------------------------------------------------\n");
    } catch (error) {
      console.error("Zod Validation Error:", error);
      return res.status(500).json({
        message:
          "Gemini returned inconsistent data that failed Zod validation.",
        error: error.errors || error.message,
      });
    }

    // 8. Save to MongoDB
    const newResumeEvaluation = new Resume({
      userId: req.user._id,
      resumePath: req.file.path,
      resumeText,
      selfDescription,
      jobDescription,
      atsScore: aiResult.atsScore,
      missingKeywords: aiResult.missingKeywords,
      matchedKeywords: aiResult.matchedKeywords,
      spellingAndGrammarIssues: aiResult.spellingAndGrammarIssues,
      formattingIssues: aiResult.formattingIssues,
      projectSuggestions: aiResult.projectSuggestions,
      aiFeedback: aiResult.aiFeedback,
    });

    await newResumeEvaluation.save();

    res.status(200).json({
      message: "Resume analyzed successfully",
      data: newResumeEvaluation,
    });
  } catch (error) {
    console.error("Resume Analysis Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during resume analysis." });
  }
};

export const getHistory = async (req, res) => {
  try {
    const history = await Resume.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(history);
  } catch (error) {
    console.error("Get History Error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch resume evaluation history." });
  }
};
