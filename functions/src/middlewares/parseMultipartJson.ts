import {Request, Response, NextFunction} from "express";
import {devLog} from "../utils/dev";

/**
 * Middleware to parse JSON strings coming from multipart/form-data fields.
 * Usage: parseMultipartJson(["details","otherField"])
 */
export const parseMultipartJson = (fields: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return next();
    }

    for (const f of fields) {
      const val = (req.body as any)[f];

      if (typeof val === "string") {
        // Handle JSON string (from multipart form-data)
        try {
          const parsed = JSON.parse(val);
          // Promote the parsed object properties to root body for validation
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            Object.assign(req.body, parsed);
            delete (req.body as any)[f];
          } else {
            (req.body as any)[f] = parsed;
          }
        } catch (e) {
          devLog(`[parseMultipartJson] Failed to parse field "${f}": ` + String(e));
          // leave the original string if it's not valid JSON
        }
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        // Handle JSON object (from application/json with details wrapper)
        Object.assign(req.body, val);
        delete (req.body as any)[f];
      }
    }
    next();
  } catch (err) {
    devLog("[parseMultipartJson] Error: " + String(err));
    next();
  }
};

export default parseMultipartJson;
