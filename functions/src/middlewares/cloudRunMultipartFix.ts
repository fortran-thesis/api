import {Request, Response, NextFunction} from "express";
import {Readable} from "stream";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Busboy = require("busboy");

/**
 * Fix for Firebase Functions / Cloud Run consuming the request stream.
 * This reconstructs the stream from the rawBody if it exists.
 *
 * IMPORTANT: Requires preserveRawBody: true in Firebase Functions v2 config
 */
export const cloudRunMultipartFix = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  console.log("[CLOUD RUN FIX] Multipart request detected");
  console.log("[CLOUD RUN FIX] Stream state:", {
    readable: req.readable,
    readableEnded: req.readableEnded,
    readableFlowing: req.readableFlowing,
  });

  // Firebase Functions attaches rawBody to the request when preserveRawBody is enabled
  const rawBody = (req as any).rawBody;

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    console.error("[CLOUD RUN FIX] No rawBody found!");
    console.error("[CLOUD RUN FIX] Make sure preserveRawBody: true is set in onRequest config");
    return next(new Error("Raw body not available. Check Firebase Functions configuration."));
  }

  console.log("[CLOUD RUN FIX] Found rawBody, reconstructing stream...");
  console.log("[CLOUD RUN FIX] rawBody length:", rawBody.length);

  // Check if we've already processed this request
  if ((req as any)._multipartProcessed) {
    console.log("[CLOUD RUN FIX] Already processed, skipping...");
    return next();
  }

  // Mark as processed to avoid double-processing
  (req as any)._multipartProcessed = true;

  // Create a readable stream from the buffer
  const stream = Readable.from(rawBody);

  // Parse with busboy
  try {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10,
        fields: 20,
        parts: 30,
      },
    });

    // IMPORTANT: Reset body completely to avoid corrupted pre-parsed data
    req.body = {};
    const files: Express.Multer.File[] = [];
    let fieldCount = 0;
    let fileCount = 0;
    let hasError = false;

    busboy.on("field", (fieldname: string, value: string) => {
      fieldCount++;
      console.log(`[CLOUD RUN FIX] Field: ${fieldname} (${value.length} bytes)`);
      req.body[fieldname] = value;
    });

    busboy.on("file", (fieldname: string, file: any, info: any) => {
      fileCount++;
      console.log(`[CLOUD RUN FIX] File: ${fieldname}, ${info.filename}`);

      const chunks: Buffer[] = [];

      file.on("data", (data: Buffer) => {
        chunks.push(data);
      });

      file.on("limit", () => {
        console.error(`[CLOUD RUN FIX] File size limit exceeded for: ${fieldname}`);
      });

      file.on("error", (err: Error) => {
        console.error(`[CLOUD RUN FIX] File stream error for ${fieldname}:`, err);
        hasError = true;
      });

      file.on("end", () => {
        if (!hasError) {
          const buffer = Buffer.concat(chunks);
          const multerFile: Express.Multer.File = {
            fieldname,
            originalname: info.filename,
            encoding: info.encoding,
            mimetype: info.mimeType,
            buffer,
            size: buffer.length,
          } as Express.Multer.File;
          files.push(multerFile);
          console.log(`[CLOUD RUN FIX] File ${fieldname} completed: ${buffer.length} bytes`);
        }
      });
    });

    busboy.on("error", (err: Error) => {
      console.error("[CLOUD RUN FIX] Busboy error:", err);
      hasError = true;
      // Clean up the stream
      stream.destroy();
      next(err);
    });

    busboy.on("finish", () => {
      if (hasError) {
        console.log("[CLOUD RUN FIX] Finished with errors, not calling next()");
        return;
      }

      console.log(`[CLOUD RUN FIX] Complete: ${fieldCount} fields, ${fileCount} files`);
      console.log("[CLOUD RUN FIX] Body keys:", Object.keys(req.body));

      if (files.length > 0) {
        req.files = files;
        console.log("[CLOUD RUN FIX] Attached files to req.files");
      }

      next();
    });

    // Pipe the stream to busboy
    stream.pipe(busboy);
  } catch (err: any) {
    console.error("[CLOUD RUN FIX] Setup error:", err);
    return next(err);
  }
};
