
import { Options, ipKeyGenerator } from "express-rate-limit";

// Generic keyGenerator to handle undefined request.ip
const genericKeyGenerator = (req: any) => req.ip || ipKeyGenerator(req)|| '127.0.0.1';

export const limitingOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: genericKeyGenerator,
};

// Step 1: Send code (strict limit)
export const sendCodeLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 3 requests per hour per IP
  message: "Too many requests. Please try again later.",
  keyGenerator: genericKeyGenerator,
};

// Step 2: Verify code (medium limit)
export const verifyCodeLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Please try again later.",
  keyGenerator: genericKeyGenerator,
};

// Step 3: Final action (medium limit)
export const finalActionLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many sensitive actions. Please try again later.",
  keyGenerator: genericKeyGenerator,
};
