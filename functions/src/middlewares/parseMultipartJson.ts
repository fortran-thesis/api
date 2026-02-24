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
    devLog("[parseMultipartJson] Content-Type: " + req.headers["content-type"]);
    devLog("[parseMultipartJson] Content-Length: " + req.headers["content-length"]);
    devLog("[parseMultipartJson] Body keys: " + Object.keys(req.body || {}).join(", "));

    if (!req.body || typeof req.body !== "object") {
      devLog("[parseMultipartJson] No body or body is not an object");
      return next();
    }

    for (const f of fields) {
      const val = (req.body as any)[f];
      devLog(`[parseMultipartJson] Field "${f}" type: ${typeof val}`);

      if (typeof val === "string") {
        // Handle JSON string (from multipart form-data)
        try {
          const parsed = JSON.parse(val);
          devLog(`[parseMultipartJson] Successfully parsed field "${f}" from string`);
          // Promote the parsed object properties to root body for validation
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            Object.assign(req.body, parsed);
            delete (req.body as any)[f];
            devLog(`[parseMultipartJson] Promoted "${f}" to root body`);
          } else {
            (req.body as any)[f] = parsed;
          }
        } catch (e) {
          devLog(`[parseMultipartJson] Failed to parse field "${f}": ` + String(e));
          // leave the original string if it's not valid JSON
        }
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        // Handle JSON object (from application/json with details wrapper)
        devLog(`[parseMultipartJson] Field "${f}" is already an object, promoting to root body`);
        Object.assign(req.body, val);
        delete (req.body as any)[f];
        devLog(`[parseMultipartJson] Promoted "${f}" (object) to root body`);
      }
    }
    devLog("[parseMultipartJson] Final body keys: " + Object.keys(req.body || {}).join(", "));
    next();
  } catch (err) {
    devLog("[parseMultipartJson] Error: " + String(err));
    next();
  }
};

export default parseMultipartJson;
