import {envOptions} from "../configs/environment";
import * as logger from "firebase-functions/logger";

type ApiErrorShape = { success: false; error: string };

export const devLog = (error: unknown, context?: string): void => {
  if (!envOptions.isDev) return;

  const timestamp = new Date().toISOString();
  const contextTag = context ?? "Unlabeled";

  const safeLoggerError = (payload: any) => {
    try {
      logger.error(payload);
    } catch (e) {
      // Fallback to console.error if logger fails
      console.error("[devLog fallback]", payload);
    }
  };

  // Handle structured API error responses
  if (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    "error" in error &&
    (error as ApiErrorShape).success === false
  ) {
    safeLoggerError({
      context: contextTag,
      error: (error as ApiErrorShape).error,
      timestamp,
    });
    return;
  }

  // Handle native Error instances
  if (error instanceof Error) {
    safeLoggerError({
      context: contextTag,
      error: error.message,
      stack: error.stack,
      timestamp,
    });
    return;
  }

  // Fallback for unknown types
  safeLoggerError({
    context: contextTag,
    error: String(error),
    timestamp,
  });
};
