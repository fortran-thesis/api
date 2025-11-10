import {Request, Response, NextFunction} from "express";
import {Readable} from "stream";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Busboy = require("busboy");

/**
 * Fix for Firebase Functions / Cloud Run consuming the request stream.
 * This reconstructs the stream from the rawBody if it exists.
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
  });

  // Check if stream is already consumed
  if (!req.readable || req.readableEnded) {
    console.log("[CLOUD RUN FIX] Stream already consumed, trying rawBody...");
    
    // Firebase Functions attaches rawBody to the request
    const rawBody = (req as any).rawBody;
    
    if (rawBody && Buffer.isBuffer(rawBody)) {
      console.log("[CLOUD RUN FIX] Found rawBody, reconstructing stream...");
      console.log("[CLOUD RUN FIX] rawBody length:", rawBody.length);
      
      // Create a readable stream from the buffer
      const stream = Readable.from(rawBody);
      
      // Parse with busboy
      try {
        const busboy = Busboy({
          headers: req.headers,
          limits: {
            fileSize: 10 * 1024 * 1024,
            files: 10,
            fields: 20,
            parts: 30,
          },
        });

        req.body = req.body || {};
        const files: Express.Multer.File[] = [];
        let fieldCount = 0;
        let fileCount = 0;

        busboy.on("field", (fieldname: string, value: string) => {
          fieldCount++;
          console.log(`[CLOUD RUN FIX] Field: ${fieldname} (${value.length} bytes)`);
          req.body[fieldname] = value;
        });

        busboy.on("file", (fieldname: string, file: any, info: any) => {
          fileCount++;
          console.log(`[CLOUD RUN FIX] File: ${fieldname}, ${info.filename}`);
          
          const chunks: Buffer[] = [];
          
          file.on("data", (data: Buffer) => chunks.push(data));
          
          file.on("end", () => {
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
          });
        });

        busboy.on("error", (err: Error) => {
          console.error("[CLOUD RUN FIX] Busboy error:", err);
          next(err);
        });

        busboy.on("finish", () => {
          console.log(`[CLOUD RUN FIX] Complete: ${fieldCount} fields, ${fileCount} files`);
          console.log(`[CLOUD RUN FIX] Body type:`, typeof req.body);
          console.log(`[CLOUD RUN FIX] Body keys:`, req.body ? Object.keys(req.body).slice(0, 10) : 'none');
          console.log(`[CLOUD RUN FIX] Body.details exists:`, !!(req.body as any)?.details);
          if (files.length > 0) req.files = files;
          next();
        });

        stream.pipe(busboy);
        return;
        
      } catch (err: any) {
        console.error("[CLOUD RUN FIX] Setup error:", err);
        return next(err);
      }
    } else {
      console.error("[CLOUD RUN FIX] No rawBody found! Stream is consumed and unrecoverable.");
      return next(new Error("Request stream consumed without rawBody"));
    }
  }

  // Stream is still readable, continue normally
  console.log("[CLOUD RUN FIX] Stream is readable, continuing...");
  next();
};
