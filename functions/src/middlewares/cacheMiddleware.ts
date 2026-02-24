import {Request, Response, NextFunction} from "express";
import {getCache, setCache} from "../utils/redis";
import {
  generateListCacheKey,
  handlePostCache,
  handlePatchCache,
  handleDeleteCache,
} from "../utils/cacheManager";
import {devLog} from "../utils/dev";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type InvalidationType = "create" | "update" | "delete";

// ─────────────────────────────────────────────────────────────────────────────
// Read-through cache middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Response-level read-through cache middleware for paginated GET endpoints.
 *
 * Flow:
 *   1. Build a cache key from the resource + query string params.
 *   2. HIT  → return the cached payload immediately; controller never runs.
 *   3. MISS → let the controller run normally; intercept `res.json()` so the
 *             successful response body is stored in Redis for future requests.
 *
 * The cache key format — `<resource>:list:<base64-hash>` — is intentionally
 * the same as `generateListCacheKey` used inside the service layer, so both
 * levels share the same Redis keyspace and are interoperable.
 *
 * @param resource  Redis resource namespace (e.g. "users", "mold-reports")
 * @param ttl       Cache TTL in seconds (default: 300 s / 5 min)
 */
export const cacheGet = (resource: string, ttl = 300) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = generateListCacheKey(resource, req.query as Record<string, any>);

    try {
      const cached = await getCache<any>(key);
      if (cached !== null) {
        devLog(`[CACHE MW] HIT  ${key}`);
        res.json({success: true, data: cached});
        return;
      }
    } catch (err) {
      // Redis is unavailable → transparent miss, proceed normally
      devLog(`[CACHE MW] Redis read error (${key}): ${err}`);
    }

    // Cache miss — monkey-patch res.json to capture the outgoing body
    devLog(`[CACHE MW] MISS ${key}`);
    const origJson = res.json.bind(res) as typeof res.json;
    res.json = function patchedJson(body: any): Response {
      // Only cache 2xx successful responses that carry a `data` payload
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success && body?.data != null) {
        setCache(key, body.data, ttl).catch((err) => {
          devLog(`[CACHE MW] Redis write error (${key}): ${err}`);
        });
      }
      return origJson(body);
    };

    next();
  };

// ─────────────────────────────────────────────────────────────────────────────
// Cache invalidation middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache invalidation middleware for write endpoints (POST / PATCH / DELETE).
 *
 * Runs after the response is sent (`res.on("finish")`), so it never adds
 * latency to the HTTP response.  Only fires for successful (2xx) responses.
 *
 * | type     | invalidates                                    |
 * |----------|------------------------------------------------|
 * | create   | all lists + counts for `resource`              |
 * | update   | the modified item + all lists for `resource`   |
 * | delete   | item + all lists + counts for `resource`       |
 *
 * @param resource  Redis resource namespace
 * @param type      Write type — "create" | "update" | "delete"
 * @param idFn      Optional resolver for the affected item ID.
 *                  Defaults to `req.auditTargetId ?? req.params.id`.
 */
export const cacheInvalidate = (
  resource: string,
  type: InvalidationType,
  idFn?: (req: Request) => string
) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const id = (idFn ? idFn(req) : (req.auditTargetId ?? req.params.id)) ?? "unknown";

      const invalidate =
        type === "create" ?
          handlePostCache(resource) :
          type === "update" ?
            handlePatchCache(resource, id, true) :
            handleDeleteCache(resource, id);

      invalidate.catch((err) => {
        devLog(`[CACHE MW] Invalidation error (${resource}/${type}): ${err}`);
      });
    });

    next();
  };
