/**
 * Model Proxy Service
 *
 * Forwards requests to the Lambda-hosted ML inference API using the fusion model endpoints.
 *
 * Endpoints
 * ---------
 * - JSON:      `/api/v3/predict` (IntermediateFusionModel)
 * - Multipart:  `/api/v3/predict-multipart` (IntermediateFusionModel)
 *
 * Response tagging
 * ----------------
 * All responses are tagged with `_model_source: "fusion"` so clients can verify
 * they received the expected fusion model response.
 */
import {envOptions} from "../configs/environment";
import {devLog} from "../utils/dev";
import {logger} from "../configs/logger";

/** Resolved at startup from environment */
const LAMBDA_URL = (envOptions.lambdaUrl || "").trim();
const INTERNAL_KEY = (envOptions.modelInternalKey || "").trim();
const MODEL_PROXY_TIMEOUT_MS = Number(process.env.MODEL_PROXY_TIMEOUT_MS || "120000");

export interface ProxyResult {
  status: number;
  body: unknown;
}

/**
 * Identifies which model endpoint produced a response.
 * Injected by the proxy into every successful response body so clients
 * can select the correct response parser without guessing.
 *
 * - `"fusion"` – `/api/v3/predict` or `/api/v3/predict-multipart`
 *               Shape: `{ fusion: { predicted_class, confidence, probabilities }, cnn, used_fusion }`
 * - `"legacy"` – `/v2/predict` or `/default/multimodal-prediction`
 *               Shape: `{ predicted_class, confidence, probabilities, cnn, used_ann }`
 */
export type ModelSource = "fusion" | "legacy";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Builds the base request headers, adding the internal key when configured. */
const makeHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {...extra};
  if (INTERNAL_KEY) {
    headers["X-Internal-Key"] = INTERNAL_KEY;
  } else {
    devLog("[modelProxy] WARNING: INTERNAL_KEY is empty/unset");
  }
  return headers;
};

/**
 * Payload v1 gateways can occasionally drop custom headers.
 * Add the same internal key as a query fallback for server-to-server calls.
 */
const withInternalKeyFallback = (params?: Record<string, string>): Record<string, string> | undefined => {
  if (!INTERNAL_KEY) return params;
  return {...params, internal_key: INTERNAL_KEY};
};

/**
 * Build upstream URL by preserving the configured base URL exactly.
 * This avoids implicit stage/path rewrites that can cause API Gateway 404.
 */
const buildModelUrl = (path: string, params?: Record<string, string>): string => {
  const joined = `${LAMBDA_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return joined;

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    query.set(k, v);
  }

  const sep = joined.includes("?") ? "&" : "?";
  return `${joined}${sep}${query.toString()}`;
};

/** Redact sensitive query values before logging upstream URLs. */
const sanitizeUrlForLog = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("internal_key")) {
      parsed.searchParams.set("internal_key", "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * Merges a `_model_source` tag into the response body.
 * If the body is not a plain object the tag is dropped silently.
 */
const tagBody = (body: unknown, source: ModelSource): unknown => {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    return {...(body as Record<string, unknown>), _model_source: source};
  }
  return body;
};

/**
 * Parse upstream body safely. API Gateway/Lambda can return non-JSON error pages
 * (or empty bodies), which would otherwise throw and be misreported as 502.
 */
const parseUpstreamBody = async (res: Response): Promise<unknown> => {
  const raw = await res.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {error: raw};
  }
};

const isTimeoutError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  return err.name === "TimeoutError" || err.name === "AbortError";
};

const buildPathCandidates = (endpointPath: string): string[] => {
  const normalized = endpointPath.replace(/^\/+/, "");
  const withoutApi = normalized.startsWith("api/") ? normalized.slice(4) : normalized;
  const withDoubleApi = normalized.startsWith("api/") ? `api/${normalized}` : `api/${normalized}`;

  // Prefer the route without the /api prefix first; this is the most stable
  // path across Lambda + Flask blueprint wiring.
  return Array.from(new Set([withoutApi, normalized, withDoubleApi]));
};

// ---------------------------------------------------------------------------
// JSON predict
// ---------------------------------------------------------------------------

/**
 * Forward a JSON prediction request to the Lambda model API.
 *
 * Uses `/v3/predict` (IntermediateFusionModel) exclusively.
 * No fallback to legacy endpoints.
 */
export const proxyJsonPredict = async (
  payload: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<ProxyResult> => {
  if (!LAMBDA_URL) {
    logger.error({ctx: "modelProxy", endpoint: "api/v3/predict"}, "MODEL_LAMBDA_URL is empty");
    return {status: 500, body: {error: "Model service URL not configured"}};
  }
  if (!INTERNAL_KEY) {
    logger.error({ctx: "modelProxy", endpoint: "api/v3/predict"}, "MODEL_INTERNAL_KEY is empty");
    return {status: 500, body: {error: "Model service internal key not configured"}};
  }

  const headers = makeHeaders({"Content-Type": "application/json"});
  const body = JSON.stringify(payload);

  // ── v3 fusion endpoint (fusion model) ─────────────────────────────────────
  try {
    const pathCandidates = buildPathCandidates("api/v3/predict");

    for (let index = 0; index < pathCandidates.length; index += 1) {
      const path = pathCandidates[index];
      const url = buildModelUrl(path, withInternalKeyFallback(queryParams));
      const loggedUrl = sanitizeUrlForLog(url);
      const startedAt = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(MODEL_PROXY_TIMEOUT_MS),
      });

      const upstreamBody = await parseUpstreamBody(res);
      const latencyMs = Date.now() - startedAt;

      logger.info(
        {
          ctx: "modelProxy",
          endpoint: "api/v3/predict",
          resolvedPath: path,
          status: res.status,
          latencyMs,
          url: loggedUrl,
          attempt: index + 1,
        },
        "Upstream model request completed"
      );

      if (res.status === 404 && index < pathCandidates.length - 1) {
        logger.info(
          {
            ctx: "modelProxy",
            endpoint: "api/v3/predict",
            resolvedPath: path,
            url: loggedUrl,
            attempt: index + 1,
          },
          "Upstream returned 404 for preferred endpoint path; trying fallback candidate"
        );
        continue;
      }

      return {status: res.status, body: tagBody(upstreamBody, "fusion")};
    }

    return {status: 404, body: {error: "Model endpoint not found"}};
  } catch (err) {
    devLog(err, "modelProxy:jsonPredict failed");
    logger.error({err, ctx: "modelProxy", endpoint: "api/v3/predict"}, "Upstream model request failed");
    if (isTimeoutError(err)) {
      return {status: 504, body: {error: "Model service timed out"}};
    }
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};

// ---------------------------------------------------------------------------
// Multipart predict
// ---------------------------------------------------------------------------

/**
 * Forward a multipart prediction request to the Lambda model API.
 *
 * Re-assembles the multipart body from the parsed file + fields.
 * Uses `/v3/predict-multipart` (IntermediateFusionModel) exclusively.
 * No fallback to legacy endpoints.
 */
export const proxyMultipartPredict = async (
  file: Express.Multer.File,
  formFields: Record<string, string>,
  queryParams?: Record<string, string>
): Promise<ProxyResult> => {
  if (!LAMBDA_URL) {
    logger.error({ctx: "modelProxy", endpoint: "api/v3/predict-multipart"}, "MODEL_LAMBDA_URL is empty");
    return {status: 500, body: {error: "Model service URL not configured"}};
  }
  if (!INTERNAL_KEY) {
    logger.error({ctx: "modelProxy", endpoint: "api/v3/predict-multipart"}, "MODEL_INTERNAL_KEY is empty");
    return {status: 500, body: {error: "Model service internal key not configured"}};
  }

  const headers = makeHeaders();

  /** Builds a fresh FormData (fetch body streams are single-use). */
  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("image", new Blob([new Uint8Array(file.buffer)], {type: file.mimetype}), file.originalname);
    for (const [k, v] of Object.entries(formFields)) {
      fd.append(k, v);
    }
    return fd;
  };

  // ── v3 fusion multipart endpoint ─────────────────────────────────────────
  try {
    const pathCandidates = buildPathCandidates("api/v3/predict-multipart");

    for (let index = 0; index < pathCandidates.length; index += 1) {
      const path = pathCandidates[index];
      const url = buildModelUrl(path, withInternalKeyFallback(queryParams));
      const loggedUrl = sanitizeUrlForLog(url);
      const startedAt = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: buildFormData() as any,
        signal: AbortSignal.timeout(MODEL_PROXY_TIMEOUT_MS),
      });

      const upstreamBody = await parseUpstreamBody(res);
      const latencyMs = Date.now() - startedAt;

      logger.info(
        {
          ctx: "modelProxy",
          endpoint: "api/v3/predict-multipart",
          resolvedPath: path,
          status: res.status,
          latencyMs,
          url: loggedUrl,
          attempt: index + 1,
        },
        "Upstream model request completed"
      );

      if (res.status === 404 && index < pathCandidates.length - 1) {
        logger.info(
          {
            ctx: "modelProxy",
            endpoint: "api/v3/predict-multipart",
            resolvedPath: path,
            url: loggedUrl,
            attempt: index + 1,
          },
          "Upstream returned 404 for preferred endpoint path; trying fallback candidate"
        );
        continue;
      }

      return {status: res.status, body: tagBody(upstreamBody, "fusion")};
    }

    return {status: 404, body: {error: "Model endpoint not found"}};
  } catch (err) {
    devLog(err, "modelProxy:multipartPredict failed");
    logger.error(
      {err, ctx: "modelProxy", endpoint: "api/v3/predict-multipart"},
      "Upstream model request failed"
    );
    if (isTimeoutError(err)) {
      return {status: 504, body: {error: "Model service timed out"}};
    }
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};
