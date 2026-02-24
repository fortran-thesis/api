import pino from "pino";
import {envOptions} from "./environment";

/**
 * Central pino logger instance.
 *
 * - test  → silent (no output during test runs)
 * - dev   → pino-pretty with colourised, human-readable output
 * - prod  → JSON to stdout (Cloud Logging picks this up automatically on Cloud Run)
 *
 * Sensitive headers are redacted before the log entry is written.
 */
export const logger = pino({
  level: envOptions.isTest ? "silent" : envOptions.isDev ? "debug" : "info",
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
