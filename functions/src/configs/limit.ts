
import {Options, ipKeyGenerator} from "express-rate-limit";
import {RedisStore} from "rate-limit-redis";
import {ensureRedisConnection} from "./redis";
import {envOptions} from "./environment";

const useRedisLimiterStore = envOptions.isProd && !envOptions.isTest;

const createLimiterStore = () => {
  if (!useRedisLimiterStore) return undefined;

  return new RedisStore({
    prefix: "rl:",
    sendCommand: async (...args: string[]) => {
      const redis = await ensureRedisConnection();
      return redis.sendCommand(args);
    },
  });
};

/**
 * Key generator that prefers X-Forwarded-For (Cloud Run sets this),
 * then falls back to req.ip, then the express-rate-limit default.
 * Never falls back to the static "127.0.0.1" string — that would
 * make every request share a single bucket in dev.
 */
const genericKeyGenerator = (req: any): string => {
  // Cloud Run / reverse-proxy header
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // Express request.ip (may be undefined in some test environments)
  if (req.ip) return req.ip;
  // express-rate-limit built-in (returns socket.remoteAddress)
  return ipKeyGenerator(req) || `anon-${Date.now()}`;
};

const createUserScopedKeyGenerator = (scope: string) => (req: any): string => {
  const userId = req.user?.id;
  if (typeof userId === "string" && userId.trim()) {
    return `${scope}:${userId}`;
  }

  return genericKeyGenerator(req);
};

const lookupUserKeyGenerator = createUserScopedKeyGenerator("lookup-user");
const modelUserKeyGenerator = createUserScopedKeyGenerator("model-user");
const reportUserKeyGenerator = createUserScopedKeyGenerator("report-user");
const flagReportUserKeyGenerator = createUserScopedKeyGenerator("flag-report-user");

export const limitingOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: genericKeyGenerator,
  store: createLimiterStore(),
};

// Step 1: Send code (strict limit)
export const sendCodeLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 3 requests per hour per IP
  message: "Too many requests. Please try again later.",
  keyGenerator: genericKeyGenerator,
  store: createLimiterStore(),
};

// Step 2: Verify code (medium limit)
export const verifyCodeLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Please try again later.",
  keyGenerator: genericKeyGenerator,
  store: createLimiterStore(),
};

// Step 3: Final action (medium limit)
export const finalActionLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many sensitive actions. Please try again later.",
  keyGenerator: genericKeyGenerator,
  store: createLimiterStore(),
};

// Account creation throttling to reduce signup abuse bursts.
export const registerLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: "Too many registration attempts. Please try again later.",
  keyGenerator: genericKeyGenerator,
  store: createLimiterStore(),
};

// ML prediction endpoints are compute-heavy; apply tighter per-user limits.
export const modelPredictionLimiter: Partial<Options> = {
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: "Too many prediction requests. Please try again later.",
  keyGenerator: modelUserKeyGenerator,
  store: createLimiterStore(),
};

export const reportCreateLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many reports submitted. Please try again later.",
  keyGenerator: reportUserKeyGenerator,
  store: createLimiterStore(),
};

export const flagReportCreateLimiter: Partial<Options> = {
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many flag reports submitted. Please try again later.",
  keyGenerator: flagReportUserKeyGenerator,
  store: createLimiterStore(),
};

export const lookupLimiter: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many lookup requests. Please try again later.",
  keyGenerator: lookupUserKeyGenerator,
  store: createLimiterStore(),
};
