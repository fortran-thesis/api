import pino from "pino";
import {envOptions} from "./environment";

// Map pino level labels to Google Cloud Logging severity strings.
// Without this, Cloud Logging defaults everything to DEFAULT and shows
// the numeric `level` field instead of a proper severity.
const gcpLevelToSeverity: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

/**
 * Central pino logger instance.
 *
 * - test  → silent (no output during test runs)
 * - dev   → pino-pretty with colourised, human-readable output
 * - prod  → structured JSON to stdout; field names are aligned with the
 *           Cloud Logging JSON payload spec so Cloud Run picks up severity
 *           and message automatically without requiring a log agent.
 *
 * Sensitive headers are redacted before the log entry is written.
 */
export const logger = pino({
  level: envOptions.isTest ? "silent" : envOptions.isDev ? "debug" : "info",

  // Cloud Logging expects "message", pino defaults to "msg".
  messageKey: "message",

  // Cloud Logging expects "severity", pino defaults to numeric "level".
  // Only apply the GCP formatter in non-dev environments so pino-pretty
  // still receives standard labels in development.
  ...(!envOptions.isDev && !envOptions.isTest ?
    {
      formatters: {
        level(label) {
          return {severity: gcpLevelToSeverity[label] ?? "DEFAULT"};
        },
      },
    } :
    {}),

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
    ],
    censor: "[REDACTED]",
  },
  ...(envOptions.isDev ?
    {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
    } :
    {}),
});
