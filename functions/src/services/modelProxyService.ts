/**
 * Model Proxy Service
 *
 * Forwards requests to the Lambda-hosted ML inference API using the fusion model endpoints.
 *
 * Endpoints
 * ---------
 * - JSON:      `/v3/predict` (IntermediateFusionModel)
 * - Multipart:  `/v3/predict-multipart` (IntermediateFusionModel)
 *
 * Response tagging
 * ----------------
 * All responses are tagged with `_model_source: "fusion"` so clients can verify
 * they received the expected fusion model response.
 */
import {envOptions} from "../configs/environment";
import {devLog} from "../utils/dev";

/** Resolved at startup from environment */
const LAMBDA_URL = envOptions.lambdaUrl;
const INTERNAL_KEY = envOptions.modelInternalKey;

export interface ProxyResult {
  status: number;
  body: unknown;
}

/**
 * Identifies which model endpoint produced a response.
 * Injected by the proxy into every successful response body so clients
 * can select the correct response parser without guessing.
 *
 * - `"fusion"` – `/v3/predict` or `/v3/predict-multipart`
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
    devLog(`[modelProxy] WARNING: INTERNAL_KEY is empty/unset`);
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

/** Attaches query params to a URL, returning the URL instance for chaining. */
const applyQueryParams = (url: URL, params?: Record<string, string>): URL => {
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url;
};

/**
 * Build a model endpoint URL while preserving any base path segment
 * (for example API Gateway stages like /prod).
 */
const buildModelUrl = (path: string, params?: Record<string, string>): URL => {
  const normalizedBase = LAMBDA_URL.endsWith("/") ? LAMBDA_URL : `${LAMBDA_URL}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);
  return applyQueryParams(url, params);
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
    return {status: 503, body: {error: "Model service URL not configured"}};
  }

  const headers = makeHeaders({"Content-Type": "application/json"});
  const body = JSON.stringify(payload);

  // ── v3 fusion endpoint (fusion model) ─────────────────────────────────────
  try {
    const url = buildModelUrl("v3/predict", withInternalKeyFallback(queryParams));
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(55_000),
    });

    return {status: res.status, body: tagBody(await res.json(), "fusion")};
  } catch (err) {
    devLog(err, "modelProxy:jsonPredict failed");
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
    return {status: 503, body: {error: "Model service URL not configured"}};
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
    const url = buildModelUrl("v3/predict-multipart", withInternalKeyFallback(queryParams));
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: buildFormData() as any,
      signal: AbortSignal.timeout(55_000),
    });

    return {status: res.status, body: tagBody(await res.json(), "fusion")};
  } catch (err) {
    devLog(err, "modelProxy:multipartPredict failed");
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};
