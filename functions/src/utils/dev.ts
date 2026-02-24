import {envOptions} from "../configs/environment";
import {logger} from "../configs/logger";

type ApiErrorShape = { success: false; error: string };

/**
 * Development logging utility.
 * Uses the central pino logger — only emits when isDev === true.
 *
 * @param error   - Error object, string message, or structured data
 * @param context - Optional context label (default: "Unlabeled")
 */
export const devLog = (error: unknown, context?: string): void => {
  if (!envOptions.isDev) return;

  const contextTag = context ?? "Unlabeled";

  // Structured API error shape: { success: false; error: string }
  if (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    "error" in error &&
    (error as ApiErrorShape).success === false
  ) {
    logger.error({ctx: contextTag}, `API_ERROR: ${(error as ApiErrorShape).error}`);
    return;
  }

  // Native Error instances
  if (error instanceof Error) {
    logger.error({err: error, ctx: contextTag}, `EXCEPTION: ${error.message}`);
    return;
  }

  // Plain string messages
  if (typeof error === "string") {
    logger.info({ctx: contextTag}, error);
    return;
  }

  // Anything else — stringify it
  logger.info({data: error, ctx: contextTag}, String(error));
};
