import {Request, Response, NextFunction} from "express";
import {devLog} from "../utils/dev";

/**
 * Typed application error with an HTTP status code.
 *
 * Throw this from controllers, services, or repositories to produce a
 * structured JSON error response via `globalErrorHandler` without leaking
 * stack traces to the client.
 *
 * @example
 *   throw new AppError(404, "Mold not found");
 *   throw new AppError(403, "Insufficient permissions");
 */
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    // Restore prototype chain broken by extending built-ins in ES5 targets.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Wraps an async route handler so that unhandled rejections and thrown
 * `AppError`s are forwarded to Express's `next(err)` chain rather than
 * surfacing as unhandled promise rejections.
 *
 * Eliminates repetitive `try/catch` boilerplate inside every controller.
 *
 * @example
 *   router.post("/", verifyUser(), asyncHandler(createMold));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

/**
 * Global Express error-handling middleware.
 *
 * Must be registered LAST in `app.ts` (after all routers and other
 * middleware) so it receives errors forwarded via `next(err)`.
 *
 * Handles:
 *  - `AppError`           — uses the embedded HTTP status code
 *  - Busboy / multipart stream errors — 400 with a human-friendly message
 *  - Multer errors        — 400 with file-upload details
 *  - Everything else      — 500 without leaking internals
 *
 * Replaces the inline error handler previously defined in `app.ts`.
 */
export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error-handling middleware by its 4-argument signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  devLog(err, "globalErrorHandler");

  if (res.headersSent) return;

  // Typed AppError — honour the embedded status code.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({success: false, error: err.message});
    return;
  }

  const anyErr = err as any;

  if (
    anyErr?.name === "AbortError" ||
    anyErr?.name === "TimeoutError" ||
    anyErr?.code === "ETIMEDOUT" ||
    anyErr?.code === "ECONNABORTED"
  ) {
    res.status(504).json({
      success: false,
      error: "Request timed out. Please try again.",
    });
    return;
  }

  // Busboy / multipart stream errors (client disconnect, incomplete upload).
  if (
    anyErr?.message === "Unexpected end of form" ||
    anyErr?.code === "UNEXPECTED_END_OF_FORM"
  ) {
    devLog("[MULTIPART ERROR] Unexpected end of form");
    res.status(400).json({
      success: false,
      error:
        "File upload error: unexpected end of form. " +
        "This may be due to network issues, an incomplete upload, or a timeout.",
    });
    return;
  }

  // Multer errors (wrong MIME type, file too large, etc.).
  if (anyErr?.name === "MulterError") {
    devLog(`[MULTER ERROR] ${anyErr.message} (code: ${anyErr.code})`);
    res.status(400).json({
      success: false,
      error: `File upload error: ${anyErr.message}`,
      code: anyErr.code,
    });
    return;
  }

  // Generic fallback — never expose stack traces or internals to clients.
  res.status(anyErr?.status || 500).json({
    success: false,
    error: "Something went wrong. An error has occurred.",
  });
};
