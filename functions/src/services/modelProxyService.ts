/**
 * Model Proxy Service
 *
 * Forwards requests to the Lambda-hosted ML inference API.
 * Phase A: transparent proxy (no auth changes on client).
 * Phase B: adds X-Internal-Key header so Lambda can reject external callers.
 *
 * Fallback strategy
 * -----------------
 * Primary:  /v3/predict            → IntermediateFusionModel (recommended)
 * Fallback: /v2/predict            → legacy CNN + ANN pipeline
 *
 * Primary:  /v3/predict-multipart  → IntermediateFusionModel (recommended)
 * Fallback: /default/multimodal-prediction → legacy multipart endpoint
 *
 * A fallback is triggered when the primary returns a 5xx status or throws
 * a network / timeout error. 4xx errors are passed through immediately
 * (they indicate a client-side problem that a retry won't fix).
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

/** Returns true when a fallback attempt is warranted for this status code. */
const shouldFallback = (status: number): boolean => status >= 500;

/** Builds the base request headers, adding the internal key when configured. */
const makeHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {...extra};
  if (INTERNAL_KEY) {
    headers["X-Internal-Key"] = INTERNAL_KEY;
  }
  return headers;
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
 * Tries `/v3/predict` (IntermediateFusionModel) first.
 * Falls back to `/v2/predict` on 5xx or network error.
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

  // ── Primary: v3 fusion endpoint ──────────────────────────────────────────
  try {
    const url = applyQueryParams(new URL("/v3/predict", LAMBDA_URL), queryParams);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(55_000),
    });

    if (!shouldFallback(res.status)) {
      return {status: res.status, body: tagBody(await res.json(), "fusion")};
    }

    devLog(`modelProxy:jsonPredict primary returned ${res.status}, falling back to v2`, "modelProxy");
  } catch (err) {
    devLog(err, "modelProxy:jsonPredict primary failed, falling back to v2");
  }

  // ── Fallback: v2 legacy endpoint ─────────────────────────────────────────
  try {
    const url = applyQueryParams(new URL("/v2/predict", LAMBDA_URL), queryParams);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(55_000),
    });

    return {status: res.status, body: tagBody(await res.json(), "legacy")};
  } catch (err) {
    devLog(err, "modelProxy:jsonPredict fallback failed");
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
 * Tries `/v3/predict-multipart` (IntermediateFusionModel) first.
 * Falls back to `/default/multimodal-prediction` on 5xx or network error.
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

  // ── Primary: v3 fusion multipart endpoint ─────────────────────────────────
  try {
    const url = applyQueryParams(new URL("/v3/predict-multipart", LAMBDA_URL), queryParams);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: buildFormData() as any,
      signal: AbortSignal.timeout(55_000),
    });

    if (!shouldFallback(res.status)) {
      return {status: res.status, body: tagBody(await res.json(), "fusion")};
    }

    devLog(`modelProxy:multipartPredict primary returned ${res.status}, falling back to legacy`, "modelProxy");
  } catch (err) {
    devLog(err, "modelProxy:multipartPredict primary failed, falling back to legacy");
  }

  // ── Fallback: legacy multimodal endpoint ──────────────────────────────────
  try {
    const url = applyQueryParams(new URL("/default/multimodal-prediction", LAMBDA_URL), queryParams);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: buildFormData() as any,
      signal: AbortSignal.timeout(55_000),
    });

    return {status: res.status, body: tagBody(await res.json(), "legacy")};
  } catch (err) {
    devLog(err, "modelProxy:multipartPredict fallback failed");
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};
