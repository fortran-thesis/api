import { Options } from "express-rate-limit";

export const limitingOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}