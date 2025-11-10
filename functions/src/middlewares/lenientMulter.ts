import {Request, Response, NextFunction} from "express";
import {upload} from "./upload";

/**
 * Lenient multer middleware that handles optional files gracefully.
 * If multer fails with "Unexpected end of form" but the body has been partially parsed,
 * we continue processing.
 */
export const lenientMulter = (fieldName: string, maxCount: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log("[LENIENT MULTER] Starting parse...");
    console.log("[LENIENT MULTER] Headers:", {
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
    });

    // Log if request stream is readable
    console.log("[LENIENT MULTER] Stream state:", {
      readable: req.readable,
      readableEnded: req.readableEnded,
      readableLength: req.readableLength,
    });

    const handler = upload.array(fieldName, maxCount);

    handler(req, res, (err: any) => {
      if (err) {
        console.error("[LENIENT MULTER] Error:", {
          message: err.message,
          code: err.code,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
        });

        // If the error is "Unexpected end of form" but we have body data,
        // the form was likely just not properly terminated (common with optional files)
        if (err.message === "Unexpected end of form") {
          if (req.body && Object.keys(req.body).length > 0) {
            console.log("[LENIENT MULTER] Continuing despite error - body was parsed");
            return next();
          }
        }

        // For other errors, pass them along
        return next(err);
      }

      console.log("[LENIENT MULTER] Success:", {
        files: Array.isArray(req.files) ? req.files.length : 0,
        bodyFields: req.body ? Object.keys(req.body) : [],
      });

      next();
    });
  };
};
