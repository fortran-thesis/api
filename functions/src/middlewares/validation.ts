/**
 * Middleware to validate the request body against a provided Zod schema.
 *
 * @param schema - The Zod schema to validate the request body against.
 * @returns An Express middleware function that validates `req.body`.
 *
 * @remarks
 * If validation fails, responds with a 400 status and the validation errors.
 * If validation succeeds, replaces `req.body` with the parsed data and calls `next()`.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * const userSchema = z.object({ name: z.string() });
 */
import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { devLog } from "../utils/dev";

/**
 * Express middleware to validate the request body against a Zod schema.
 * Responds with 400 and validation errors if validation fails.
 * If validation succeeds, replaces req.body with the parsed data and calls next().
 *
 * @param schema - The Zod schema to validate the request body against
 * @returns An Express middleware function
 */
export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message).join(", ");
        sendError(res, messages);
        return;
      }
      req.body = result.data;
      next();
      return;
    } catch (error) {
      devLog(error);
      sendError(res, "Error", 500);
      return;
    }
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message).join(", ");
        sendError(res, messages);
        return;
      }
      req.params = result.data;
      next();
    } catch (error) {
      devLog(error);
      sendError(res, "Error", 500);
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message).join(", ");
        sendError(res, messages);
        return;
      }
      req.query = result.data;
      next();
    } catch (error) {
      devLog(error);
      sendError(res, "Error", 500);
    }
  };
