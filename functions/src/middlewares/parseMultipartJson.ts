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
    if (!req.body || typeof req.body !== "object") return next();
    for (const f of fields) {
      const val = (req.body as any)[f];
      if (val && typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          // If the parsed value is an object and the field is `details`,
          // promote its properties to the root body so downstream
          // validateBody(MoldReportSchema) sees the expected shape.
          if (typeof parsed === "object") {
            // merge parsed fields into req.body, preferring parsed values
            (req as any).body = {
              ...parsed,
              // keep any other non-details fields that might exist
              ...req.body,
            };
            // remove the nested 'details' entry if present
            delete (req.body as any).details;
          } else {
            (req.body as any)[f] = parsed;
          }
        } catch (e) {
          // leave the original string if it's not valid JSON
        }
      }
    }
    next();
  } catch (err) {
    devLog(err);
    next();
  }
};

export default parseMultipartJson;
