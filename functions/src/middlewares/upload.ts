import multer from "multer";
import type { FileFilterCallback } from "multer";
import { Request } from "express";

const allowedTypes = ["image/jpeg", "image/png"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(null, false);
  },
});
