/**
 * Model Proxy Service
 *
 * Forwards requests to the Lambda-hosted ML inference API.
 * Phase A: transparent proxy (no auth changes on client).
 * Phase B: adds X-Internal-Key header so Lambda can reject external callers.
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
 * Forward a JSON prediction request to the Lambda model API.
 */
export const proxyJsonPredict = async (
  payload: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<ProxyResult> => {
  if (!LAMBDA_URL) {
    return {status: 503, body: {error: "Model service URL not configured"}};
  }

  const url = new URL("/v2/predict", LAMBDA_URL);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Phase B: attach internal key so Lambda can verify the caller
  if (INTERNAL_KEY) {
    headers["X-Internal-Key"] = INTERNAL_KEY;
  }

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000), // 55 s budget
    });

    const data = await res.json();
    return {status: res.status, body: data};
  } catch (err) {
    devLog(err, "modelProxy:jsonPredict");
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};

/**
 * Forward a multipart prediction request to the Lambda model API.
 *
 * Re-assembles the multipart body from the parsed file + fields and streams
 * it to the Lambda function URL.
 */
export const proxyMultipartPredict = async (
  file: Express.Multer.File,
  formFields: Record<string, string>,
  queryParams?: Record<string, string>
): Promise<ProxyResult> => {
  if (!LAMBDA_URL) {
    return {status: 503, body: {error: "Model service URL not configured"}};
  }

  const url = new URL("/default/multimodal-prediction", LAMBDA_URL);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }
  }

  // Build a FormData-compatible body using the standard Fetch API Blob/File
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], {type: file.mimetype});
  formData.append("image", blob, file.originalname);

  for (const [k, v] of Object.entries(formFields)) {
    formData.append(k, v);
  }

  const headers: Record<string, string> = {};
  if (INTERNAL_KEY) {
    headers["X-Internal-Key"] = INTERNAL_KEY;
  }

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: formData as any,
      signal: AbortSignal.timeout(55_000),
    });

    const data = await res.json();
    return {status: res.status, body: data};
  } catch (err) {
    devLog(err, "modelProxy:multipartPredict");
    return {status: 502, body: {error: "Model service unavailable"}};
  }
};
