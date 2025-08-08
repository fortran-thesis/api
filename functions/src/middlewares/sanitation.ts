import { Request, Response, NextFunction } from "express";
import validator from "validator";

export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof req.body === "object" && req.body !== null) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        // Remove HTML, trim, and strip low ASCII
        req.body[key] = validator.stripLow(
          req.body[key].replace(/<[^>]*>?/gm, "").trim(),
          true
        );
      }
    }
  }
  next();
};

export const sanitizeParams = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof req.params === "object" && req.params !== null) {
    for (const key in req.params) {
      if (typeof req.params[key] === "string") {
        req.params[key] = validator.stripLow(
          req.params[key].replace(/<[^>]*>?/gm, "").trim(),
          true
        );
      }
    }
  }
  next();
};
