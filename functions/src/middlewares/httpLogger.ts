import pinoHttp from "pino-http";
import {logger} from "../configs/logger";

/**
 * HTTP request/response logging middleware (pino-http).
 *
 * Logs every request after the response is sent.
 * Log level is determined by response status code:
 *   - 5xx or uncaught error → error
 *   - 4xx                   → warn
 *   - everything else       → info
 *
 * Health-check and root paths are suppressed to reduce noise.
 */
export const httpLogger = pinoHttp({
  logger,

  // Suppress noisy health-check routes
  autoLogging: {
    ignore: (req) => {
      const url = req.url ?? "";
      return url === "/" || url === "/health" || url.startsWith("/api/v1/test");
    },
  },

  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  // Trim request serialization to avoid logging sensitive body data
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
