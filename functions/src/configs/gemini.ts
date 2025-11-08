import {GoogleGenerativeAI} from "@google/generative-ai";

if (!process.env.GEMINI_CULTIVATION_LOG_API_KEY) {
  throw new Error("GEMINI_CULTIVATION_LOG_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_CULTIVATION_LOG_API_KEY);

// Using Gemini 2.5 Flash model for fast image analysis
export const cultivationModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});
