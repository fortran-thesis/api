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

  const safeLog = (message: string) => {
    try {
      logger.error(message);
    } catch (e) {
      // Fallback to console if logger fails
      console.error("[devLog fallback - ERROR]", message);
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
    safeLog(
      `[${contextTag}] API_ERROR: ${(error as ApiErrorShape).error} (${timestamp})`
    );
    return;
  }

  // Handle native Error instances
  if (error instanceof Error) {
    safeLog(
      `[${contextTag}] EXCEPTION: ${error.message}\n${error.stack} (${timestamp})`
    );
    return;
  }

  // Handle string messages (info logs)
  if (typeof error === "string") {
    safeLog(
      `[${contextTag}] INFO: ${error} (${timestamp})`
    );
    return;
  }

  // Fallback for unknown types
  safeLog(
    `[${contextTag}] UNKNOWN: ${String(error)} (${timestamp})`
  );
};
