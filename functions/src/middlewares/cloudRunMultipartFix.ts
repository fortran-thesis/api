import {Request, Response, NextFunction} from "express";
import {Readable} from "stream";
import {devLog} from "../utils/dev";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Busboy = require("busboy");

/**
 * Fix for Firebase Functions / Cloud Run consuming the request stream.
 * This reconstructs the stream from the rawBody buffer.
 *
 * IMPORTANT: Requires the raw body capture middleware to run first in app.ts
 * That middleware buffers the multipart stream before any other middleware consumes it.
 */
export const cloudRunMultipartFix = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  devLog("[CLOUD RUN FIX] ⏱️ Multipart request detected, starting parse");
  devLog("[CLOUD RUN FIX] Stream state: readable=" + req.readable + ", readableEnded=" + req.readableEnded + ", readableFlowing=" + req.readableFlowing);

  // The raw body should be captured by the raw body capture middleware in app.ts
  const rawBody = (req as any).rawBody;

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    devLog("[CLOUD RUN FIX] ❌ No rawBody found!");
    devLog("[CLOUD RUN FIX] Make sure the raw body capture middleware is enabled in app.ts");
    return next(new Error("Request stream consumed without rawBody"));
  }

  devLog("[CLOUD RUN FIX] ✅ Found rawBody: " + rawBody.length + " bytes, reconstructing stream...");

  // Check if we've already processed this request
  if ((req as any)._multipartProcessed) {
    devLog("[CLOUD RUN FIX] Already processed, skipping...");
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
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 50,
        fields: 50,
        parts: 100,
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
      devLog(`[CLOUD RUN FIX] Field: ${fieldname} (${value.length} bytes)`);
      req.body[fieldname] = value;
    });

    busboy.on("file", (fieldname: string, file: any, info: any) => {
      fileCount++;
      const fileStartTime = Date.now();
      devLog(`[CLOUD RUN FIX] 📁 File #${fileCount} START: ${info.filename}`);

      const chunks: Buffer[] = [];

      file.on("data", (data: Buffer) => {
        chunks.push(data);
      });

      file.on("limit", () => {
        devLog(`[CLOUD RUN FIX] ❌ File size limit exceeded for: ${fieldname}`);
      });

      file.on("error", (err: Error) => {
        devLog(`[CLOUD RUN FIX] ❌ File stream error for ${fieldname}: ${err}`);
        hasError = true;
      });

      file.on("end", () => {
        if (!hasError) {
          const buffer = Buffer.concat(chunks);
          const fileDuration = Date.now() - fileStartTime;
          const multerFile: Express.Multer.File = {
            fieldname,
            originalname: info.filename,
            encoding: info.encoding,
            mimetype: info.mimeType,
            buffer,
            size: buffer.length,
          } as Express.Multer.File;
          files.push(multerFile);
          devLog(`[CLOUD RUN FIX] ✅ File #${fileCount} END: ${buffer.length} bytes in ${fileDuration}ms`);
        }
      });
    });

    busboy.on("error", (err: Error) => {
      devLog("[CLOUD RUN FIX] ❌ Busboy error: " + err);
      hasError = true;
      // Clean up the stream
      stream.destroy();
      next(err);
    });

    busboy.on("finish", () => {
      const totalDuration = Date.now() - startTime;
      if (hasError) {
        devLog("[CLOUD RUN FIX] ❌ Finished with errors after " + totalDuration + "ms");
        return;
      }

      devLog(`[CLOUD RUN FIX] ✅ Parse complete: ${fieldCount} fields, ${fileCount} files in ${totalDuration}ms`);
      devLog("[CLOUD RUN FIX] Body keys: " + Object.keys(req.body).join(", "));

      if (files.length > 0) {
        req.files = files;
        devLog("[CLOUD RUN FIX] ✅ Attached " + files.length + " files to req.files");
      }

      next();
    });

    // Pipe the stream to busboy
    stream.pipe(busboy);
  } catch (err: any) {
    devLog("[CLOUD RUN FIX] ❌ Setup error: " + err);
    return next(err);
  }
};
