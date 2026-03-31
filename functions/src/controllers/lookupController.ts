import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {sendSuccess, sendError, defaultError} from "../utils/response";
import {performMoldLookup} from "../services/lookupService";

/**
 * POST /api/v1/lookup
 * Performs keyword-based mold lookup
 *
 * Request body:
 * {
 *   "symptoms": ["yellowing", "spotting"],
 *   "signs": ["white coating"],
 *   "characteristics": ["rapid spread"]
 * }
 *
 * All three fields are optional, but at least one non-empty array is expected
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "moldId": "...", "moldName": "Aspergillus Flavus", "confidence": 85 },
 *     ...
 *   ]
 * }
 */
export const lookupMolds = async (req: Request, res: Response) => {
  try {
    // Accept both 'symptoms' and 'reported_symptoms' field names
    const symptoms = req.body.symptoms || req.body.reported_symptoms || [];
    const signs = req.body.signs || req.body.reported_signs || [];
    const characteristics = req.body.characteristics || req.body.reported_characteristics || [];
    const reportedMoldNames = req.body.reported_mold_names || [];

    devLog("[lookupMolds] Received lookup request");
    devLog(
      `[lookupMolds] symptoms=${symptoms.length}, signs=${signs.length}, characteristics=${characteristics.length}`
    );

    // Validate input types
    if (!Array.isArray(symptoms)) {
      return sendError(res, "symptoms must be an array", 400);
    }
    if (!Array.isArray(signs)) {
      return sendError(res, "signs must be an array", 400);
    }
    if (!Array.isArray(characteristics)) {
      return sendError(res, "characteristics must be an array", 400);
    }

    // Validate that at least something was provided
    const totalReported = symptoms.length + signs.length + characteristics.length;
    if (totalReported === 0) {
      return sendError(
        res,
        "At least one non-empty array (symptoms, signs, or characteristics) is required",
        400
      );
    }

    // Call lookup service
    const results = await performMoldLookup(symptoms, signs, characteristics, reportedMoldNames);

    devLog(`[lookupMolds] Returning ${results.length} results`);
    return sendSuccess(res, results);
  } catch (error) {
    devLog("[lookupMolds] Error:", String(error));
    return defaultError(res);
  }
};
