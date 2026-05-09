import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    resumePath: {
        type: String, // Store locally or a remote URL
    },
    resumeText: {
        type: String, // Extracted text
        required: true,
    },
    selfDescription: {
        type: String,
    },
    jobDescription: {
        type: String,
        required: true,
    },
    atsScore: {
        type: Number,
    },
    missingKeywords: {
        type: [String],
    },
    matchedKeywords: {
        type: [String],
    },
    spellingAndGrammarIssues: {
        type: [String],
    },
    formattingIssues: {
        type: [String],
    },
    projectSuggestions: {
        type: [String],
    },
    aiFeedback: {
        type: String,
    }
}, { timestamps: true });

export default mongoose.model("Resume", resumeSchema);
