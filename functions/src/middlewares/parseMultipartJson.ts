import {Request, Response, NextFunction} from "express";

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
    console.log("[parseMultipartJson] Content-Type:", req.headers["content-type"]);
    console.log("[parseMultipartJson] Content-Length:", req.headers["content-length"]);
    console.log("[parseMultipartJson] Body keys:", Object.keys(req.body || {}));

    if (!req.body || typeof req.body !== "object") {
      console.log("[parseMultipartJson] No body or body is not an object");
      return next();
    }

    for (const f of fields) {
      const val = (req.body as any)[f];
      console.log(`[parseMultipartJson] Field "${f}" type:`, typeof val);

      if (typeof val === "string") {
        // Handle JSON string (from multipart form-data)
        try {
          const parsed = JSON.parse(val);
          console.log(`[parseMultipartJson] Successfully parsed field "${f}" from string`);
          // Promote the parsed object properties to root body for validation
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            Object.assign(req.body, parsed);
            delete (req.body as any)[f];
            console.log(`[parseMultipartJson] Promoted "${f}" to root body`);
          } else {
            (req.body as any)[f] = parsed;
          }
        } catch (e) {
          console.log(`[parseMultipartJson] Failed to parse field "${f}":`, e);
          // leave the original string if it's not valid JSON
        }
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        // Handle JSON object (from application/json with details wrapper)
        console.log(`[parseMultipartJson] Field "${f}" is already an object, promoting to root body`);
        Object.assign(req.body, val);
        delete (req.body as any)[f];
        console.log(`[parseMultipartJson] Promoted "${f}" (object) to root body`);
      }
    }
    console.log("[parseMultipartJson] Final body keys:", Object.keys(req.body || {}));
    next();
  } catch (err) {
    console.error("[parseMultipartJson] Error:", err);
    next();
  }
};

export default parseMultipartJson;
