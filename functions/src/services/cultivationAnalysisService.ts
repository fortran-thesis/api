import {cultivationModel} from "../configs/gemini";
import {devLog} from "../utils/dev";

/**
 * Analysis result structure matching CultivationLog characteristics
 */
export interface CultivationAnalysisResult {
  type: "vivo" | "vitro";
  characteristics: 
    | {lesion_size: number; lesion_color: string}
    | {colony_diameter: number; colony_color: string};
  additional_info: string;
  confidence: string;
}

/**
 * Analyze cultivation image using Gemini AI
 * @param imageBuffer - Image buffer (from multer upload)
 * @param cultivationType - "vivo" (in vivo) or "vitro" (in vitro)
 * @returns Analysis result or null if failed
 */
export const analyzeCultivationImage = async (
  imageBuffer: Buffer,
  cultivationType: "vivo" | "vitro"
): Promise<CultivationAnalysisResult | null> => {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString("base64");
    
    // Build prompt based on cultivation type
    const prompt = buildPrompt(cultivationType);
    
    // Call Gemini with image and prompt
    const result = await cultivationModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg", // Adjust if you support PNG/other formats
        },
      },
    ]);

    const response = result.response;
    const text = response.text();
    
    // Parse the JSON response from Gemini
    const parsed = parseGeminiResponse(text, cultivationType);
    
    return parsed;
  } catch (error) {
    devLog(error, "CultivationAnalysisService");
    return null;
  }
};

/**
 * Build specialized prompt based on cultivation type
 */
function buildPrompt(cultivationType: "vivo" | "vitro"): string {
  if (cultivationType === "vivo") {
    return `You are an expert mycologist analyzing an in vivo mold cultivation image (growing on a living host/plant).

Your task is to examine ONLY these two characteristics:
1. Lesion size (in millimeters) - Measure the diameter or width of the visible lesion/infected area
2. Lesion color - Describe the predominant color of the lesion (be specific: e.g., "dark brown", "yellowish-green", "black with white edges")

Return your analysis in this EXACT JSON format:
{
  "lesion_size": <number in mm>,
  "lesion_color": "<color description>",
  "additional_info": "<any relevant observations about the lesion's appearance, texture, or growth pattern>",
  "confidence": "<number in percentage>"
}

If the image is not recognizable as a mold lesion or is unclear, return:
{
  "lesion_size": 0,
  "lesion_color": "unrecognizable",
  "additional_info": "Image quality insufficient or does not show clear mold lesion",
  "confidence": "0%"
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
  } else {
    // vitro
    return `You are an expert mycologist analyzing an in vitro mold cultivation image (growing in a petri dish/culture medium).

Your task is to examine ONLY these two characteristics:
1. Colony diameter (in millimeters) - Measure the diameter of the mold colony
2. Colony color - Describe the predominant color of the colony (be specific: e.g., "white with green spores", "dark gray", "orange-brown with white edges")

Return your analysis in this EXACT JSON format:
{
  "colony_diameter": <number in mm>,
  "colony_color": "<color description>",
  "additional_info": "<any relevant observations about the colony's texture, sporulation, or growth pattern>",
  "confidence": "<number in percentage>"
}

If the image is not recognizable as a mold colony or is unclear, return:
{
  "colony_diameter": 0,
  "colony_color": "unrecognizable",
  "additional_info": "Image quality insufficient or does not show clear mold colony",
  "confidence": "0%"
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
  }
}

/**
 * Parse Gemini response text into structured result
 */
function parseGeminiResponse(
  text: string,
  cultivationType: "vivo" | "vitro"
): CultivationAnalysisResult | null {
  try {
    // Remove markdown code blocks if present
    const cleanText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    
    const parsed = JSON.parse(cleanText);
    
    // Validate and structure based on type
    if (cultivationType === "vivo") {
      return {
        type: "vivo",
        characteristics: {
          lesion_size: Number(parsed.lesion_size) || 0,
          lesion_color: parsed.lesion_color || "unknown",
        },
        additional_info: parsed.additional_info || "",
        confidence: parsed.confidence || "0%",
      };
    } else {
      return {
        type: "vitro",
        characteristics: {
          colony_diameter: Number(parsed.colony_diameter) || 0,
          colony_color: parsed.colony_color || "unknown",
        },
        additional_info: parsed.additional_info || "",
        confidence: parsed.confidence || "0%",
      };
    }
  } catch (error) {
    devLog(error, "parseGeminiResponse");
    return null;
  }
}
