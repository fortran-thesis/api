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

  // Handle structured API error responses
  if (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    "error" in error &&
    (error as ApiErrorShape).success === false
  ) {
    try {
      logger.error(
        `[${contextTag}] API_ERROR: ${(error as ApiErrorShape).error} (${timestamp})`
      );
    } catch (e) {
      console.error(
        `[devLog fallback - API_ERROR] [${contextTag}]`,
        (error as ApiErrorShape).error
      );
    }
    return;
  }

  // Handle native Error instances
  if (error instanceof Error) {
    try {
      logger.error(
        `[${contextTag}] EXCEPTION: ${error.message}\n${error.stack} (${timestamp})`
      );
    } catch (e) {
      console.error(
        `[devLog fallback - EXCEPTION] [${contextTag}]`,
        error.message,
        error.stack
      );
    }
    return;
  }

  // Handle string messages (info logs)
  if (typeof error === "string") {
    try {
      logger.info(
        `[${contextTag}] ${error} (${timestamp})`
      );
    } catch (e) {
      console.log(
        `[devLog fallback - INFO] [${contextTag}]`,
        error
      );
    }
    return;
  }

  // Fallback for unknown types
  try {
    logger.info(
      `[${contextTag}] ${String(error)} (${timestamp})`
    );
  } catch (e) {
    console.log(
      `[devLog fallback - INFO] [${contextTag}]`,
      String(error)
    );
  }
};
