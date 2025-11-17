import type {FileFilterCallback} from "multer";
import {Request, Response, NextFunction} from "express";

const allowedTypes = ["image/jpeg", "image/png"];

export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(null, false);
};

// This is a passthrough middleware for Cloud Run environments
// The actual multipart parsing is done by cloudRunMultipartFix
// This middleware validates files that were already parsed
const passthroughMulter = {
  single: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      console.log(`[PASSTHROUGH MULTER] Checking single file: ${fieldName}`);

      // Files are already parsed by cloudRunMultipartFix
      // Just validate if the file exists and meets requirements
      const files = req.files as Express.Multer.File[] | undefined;

      if (files && files.length > 0) {
        const file = files.find((f) => f.fieldname === fieldName);
        if (file) {
          // Validate file type
          if (!allowedTypes.includes(file.mimetype)) {
            console.log(`[PASSTHROUGH MULTER] Invalid file type: ${file.mimetype}`);
            return next(new Error(`Invalid file type. Only ${allowedTypes.join(", ")} are allowed.`));
          }
          // Store as req.file for compatibility with existing code
          req.file = file;
          console.log(`[PASSTHROUGH MULTER] File validated: ${file.originalname}`);
        }
      }

      next();
    };
  },

  array: (fieldName: string, maxCount: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      console.log(`[PASSTHROUGH MULTER] Checking array field: ${fieldName}, max: ${maxCount}`);

      const files = req.files as Express.Multer.File[] | undefined;

      if (files && files.length > 0) {
        const matchingFiles = files.filter((f) => f.fieldname === fieldName);

        if (matchingFiles.length > maxCount) {
          console.log(`[PASSTHROUGH MULTER] Too many files: ${matchingFiles.length} > ${maxCount}`);
          return next(new Error(`Too many files. Maximum ${maxCount} allowed.`));
        }

        // Validate all files
        for (const file of matchingFiles) {
          if (!allowedTypes.includes(file.mimetype)) {
            console.log(`[PASSTHROUGH MULTER] Invalid file type: ${file.mimetype}`);
            return next(new Error(`Invalid file type. Only ${allowedTypes.join(", ")} are allowed.`));
          }
        }

        console.log(`[PASSTHROUGH MULTER] ${matchingFiles.length} files validated`);
      }

      next();
    };
  },

  fields: (fields: {name: string; maxCount: number}[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      console.log("[PASSTHROUGH MULTER] Checking fields:", fields);

      const files = req.files as Express.Multer.File[] | undefined;

      if (files && files.length > 0) {
        for (const fieldDef of fields) {
          const matchingFiles = files.filter((f) => f.fieldname === fieldDef.name);

          if (matchingFiles.length > fieldDef.maxCount) {
            console.log(`[PASSTHROUGH MULTER] Too many files for ${fieldDef.name}: ${matchingFiles.length} > ${fieldDef.maxCount}`);
            return next(new Error(`Too many files for field ${fieldDef.name}. Maximum ${fieldDef.maxCount} allowed.`));
          }

          // Validate all files
          for (const file of matchingFiles) {
            if (!allowedTypes.includes(file.mimetype)) {
              console.log(`[PASSTHROUGH MULTER] Invalid file type: ${file.mimetype}`);
              return next(new Error(`Invalid file type. Only ${allowedTypes.join(", ")} are allowed.`));
            }
          }
        }

        console.log("[PASSTHROUGH MULTER] All fields validated");
      }

      next();
    };
  },
};

// Export the passthrough multer for Cloud Run environments
export const upload = passthroughMulter;
