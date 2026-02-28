import {GoogleGenerativeAI, GenerativeModel} from "@google/generative-ai";

let _cultivationModel: GenerativeModel | null = null;

/**
 * Lazily initializes and returns the Gemini cultivation model.
 * Throws only when actually called, not at module import time,
 * preventing cold start crashes when GEMINI_CULTIVATION_LOG_API_KEY is not set.
 */
export const getCultivationModel = (): GenerativeModel => {
  if (!_cultivationModel) {
    const apiKey = process.env.GEMINI_CULTIVATION_LOG_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_CULTIVATION_LOG_API_KEY is not defined in environment variables");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    _cultivationModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }
  return _cultivationModel;
};

// Backward compat: export a getter that lazily initializes
// Consumers should migrate to getCultivationModel()
export const cultivationModel = new Proxy({} as GenerativeModel, {
  get(_target, prop, receiver) {
    return Reflect.get(getCultivationModel(), prop, receiver);
  },
});