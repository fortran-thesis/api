import {envOptions} from "../configs/environment";
import * as logger from "firebase-functions/logger";

type ApiErrorShape = { success: false; error: string };

/**
 * Development logging utility
 * Handles errors, info messages, and structured logs
 * Only logs in dev mode (isDev = true)
 *
 * @param error - Error object, string message, or structured data
 * @param context - Optional context label (default: "Unlabeled")
 */
export const devLog = (error: unknown, context?: string): void => {
  if (!envOptions.isDev) return;

  const timestamp = new Date().toISOString();
  const contextTag = context ?? "Unlabeled";

  const safeLog = (payload: any, isError = true) => {
    try {
      if (isError) {
        logger.error(payload);
      } else {
        logger.info(payload);
      }
    } catch (e) {
      // Fallback to console if logger fails
      if (isError) {
        console.error("[devLog fallback - ERROR]", payload);
      } else {
        console.log("[devLog fallback - INFO]", payload);
      }
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
    safeLog({
      context: contextTag,
      type: "API_ERROR",
      error: (error as ApiErrorShape).error,
      timestamp,
    }, true);
    return;
  }

  // Handle native Error instances
  if (error instanceof Error) {
    safeLog({
      context: contextTag,
      type: "EXCEPTION",
      error: error.message,
      stack: error.stack,
      timestamp,
    }, true);
    return;
  }

  // Handle string messages (info logs)
  if (typeof error === "string") {
    safeLog({
      context: contextTag,
      type: "INFO",
      message: error,
      timestamp,
    }, false);
    return;
  }

  // Fallback for unknown types
  safeLog({
    context: contextTag,
    type: "UNKNOWN",
    error: String(error),
    timestamp,
  }, false);
};
