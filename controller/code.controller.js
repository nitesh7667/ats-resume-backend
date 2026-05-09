import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateCode = async (req, res) => {
    try {
        const { prompt, language } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt is required" });
        }

        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const targetLangRules = language && language !== "Auto-Detect" 
            ? `You MUST write the solution specifically in ${language}. Do NOT use any other language.`
            : `Write the solution in the programming language most appropriate for the prompt, or auto-detect it.`;

        const systemPrompt = `You are an elite, highly skilled AI Code Assistant.
Your task is to generate clean, optimized, and heavily documented code based exactly on the user's instructions.
CRITICAL RULES:
1. ONLY return the code. Do NOT wrap it in markdown blockquotes like \`\`\`javascript or \`\`\`java. Just return the raw text. 
2. Add inline comments explaining complex logic.
3. ${targetLangRules}

=============
USER INSTRUCTION:
${prompt}
=============
`;

        const result = await model.generateContent(systemPrompt);
        let codeResponse = result.response.text();

        // Extra cleanup just in case Gemini still tries to markdown wrap it
        if (codeResponse.startsWith("\`\`\`")) {
            const firstNewLine = codeResponse.indexOf("\n");
            const lastTicks = codeResponse.lastIndexOf("\`\`\`");
            if (firstNewLine !== -1 && lastTicks !== -1) {
                codeResponse = codeResponse.substring(firstNewLine + 1, lastTicks).trim();
            }
        }

        return res.status(200).json({
            success: true,
            data: codeResponse
        });

    } catch (error) {
        console.error("Code Generation Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during code generation." });
    }
};
