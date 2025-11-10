import multer from "multer";
import type {FileFilterCallback} from "multer";
import {Request} from "express";

const allowedTypes = ["image/jpeg", "image/png"];

export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(null, false);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    fieldSize: 5 * 1024 * 1024, // 5MB for field values (JSON strings)
    fields: 20, // Max number of non-file fields
    parts: 30, // Max number of parts (fields + files)
  },
  fileFilter,
});
