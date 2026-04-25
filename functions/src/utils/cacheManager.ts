import {getCache, setCache, deleteCache, deleteCachePattern, getCacheKeys} from "./redis";
import {devLog} from "./dev";
import {createHash} from "crypto";
import {PaginatedResult} from "../types/types";

/**
 * Cache Manager for modular Redis caching
 *
 * Cache Key Patterns:
 * - List: `{resource}:list:{query_params_hash}` (e.g., "users:list:abc123")
 * - List metadata: `{resource}:list:{query_params_hash}:meta`
 * - Item: `{resource}:item:{id}` (e.g., "users:item:userId123")
 * - Count: `{resource}:count` (e.g., "users:count")
 *
 * Usage:
 * - GET operations: Cache results with TTL
 * - POST operations: Invalidate list caches (new item added)
 * - PATCH operations: Invalidate specific item cache and optionally list caches
 * - DELETE operations: Invalidate item and list caches
 */

export interface CacheOptions {
  /** Time to live in seconds. Default: 300 (5 minutes) */
  ttl?: number;
  /** Whether to include this query in cache key (for filtered lists) */
  includeQuery?: boolean;
  /** Whether to use cache. If false, skip caching. Default: true */
  useCache?: boolean;
}

/**
 * Generate a consistent cache key for a list query
 * @param resource - The resource name (e.g., "users", "mold-reports")
 * @param query - Query parameters (pagination token, filters, etc.)
 */
export function generateListCacheKey(resource: string, query?: Record<string, any>): string {
  if (!query || Object.keys(query).length === 0) {
    return `${resource}:list:all`;
  }

  // Sort keys for consistent hashing
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {} as Record<string, any>);

  // Create a collision-resistant hash from query params.
  // Truncated base64 prefixes can collide for different pageToken values.
  const queryString = JSON.stringify(sortedQuery);
  const hash = createHash("sha256").update(queryString).digest("hex").substring(0, 24);
  return `${resource}:list:${hash}`;
}

/**
 * Generate cache key for a specific item
 */
export function generateItemCacheKey(resource: string, id: string): string {
  return `${resource}:item:${id}`;
}

/**
 * Generate cache key for count queries
 */
export function generateCountCacheKey(resource: string, suffix?: string): string {
  return suffix ? `${resource}:count:${suffix}` : `${resource}:count`;
}

const DEFAULT_LIST_TTL_SECONDS = 300;
const LIST_METADATA_SUFFIX = ":meta";
const FALLBACK_LIST_RESOURCES = new Set(["mold-reports-search"]);
const DERIVED_QUERY_KEYS = ["search", "q", "keyword", "query"];

export type CachedListMutationKind = "mutate" | "fallback";

export interface CachedListMetadata {
  resource: string;
  key: string;
  query: Record<string, any> | null;
  ttl: number;
  cachedAt: number;
  legacy?: boolean;
}

export interface CachedListDescriptor {
  key: string;
  metadata: CachedListMetadata;
}

export interface CachedListMutationPolicy {
  resource: string;
  kind: CachedListMutationKind;
  reason: string;
}

export interface CachedListMutationSummary {
  mutatedKeys: string[];
  skippedKeys: string[];
  unsupportedKeys: string[];
  paginationImpactedKeys: string[];
}

export interface CachedListMutationOptions<T extends Record<string, any>> {
  idSelector?: (item: T) => string | null | undefined;
  shouldMutate?: (descriptor: CachedListDescriptor) => boolean;
}

type CachedListPayload<T> = T[] | PaginatedResult<T[]>;

const normalizeListQuery = (query?: Record<string, any>): Record<string, any> | null => {
  if (!query) return null;

  const normalizedEntries = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  if (normalizedEntries.length === 0) return null;

  return normalizedEntries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
};

const isDerivedListQuery = (query?: Record<string, any> | null): boolean => {
  if (!query) return false;

  return DERIVED_QUERY_KEYS.some((key) => {
    const value = query[key];
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value !== undefined && value !== null;
  });
};

export const generateListMetadataCacheKey = (listKey: string): string => {
  return `${listKey}${LIST_METADATA_SUFFIX}`;
};

export const getCachedListMutationPolicy = (
  resource: string,
  query?: Record<string, any> | null
): CachedListMutationPolicy => {
  const normalizedResource = typeof resource === "string" ? resource : "";

  if (!normalizedResource || FALLBACK_LIST_RESOURCES.has(normalizedResource) || isDerivedListQuery(query)) {
    return {
      resource: normalizedResource,
      kind: "fallback",
      reason: "derived or search-based list cache",
    };
  }

  return {
    resource: normalizedResource,
    kind: "mutate",
    reason: "stable list cache",
  };
};

export const shouldMutateCachedList = (
  resource: string,
  query?: Record<string, any> | null
): boolean => {
  return getCachedListMutationPolicy(resource, query).kind === "mutate";
};

const resolveCachedListResource = (key: string): string => {
  const splitIndex = key.indexOf(":list:");
  if (splitIndex <= 0) return key;
  return key.substring(0, splitIndex);
};

const buildLegacyListMetadata = (key: string): CachedListMetadata => ({
  resource: resolveCachedListResource(key),
  key,
  query: null,
  ttl: DEFAULT_LIST_TTL_SECONDS,
  cachedAt: 0,
  legacy: true,
});

const getCachedListMetadataByKey = async (key: string): Promise<CachedListMetadata> => {
  const metadataKey = generateListMetadataCacheKey(key);
  const cached = await getCache<CachedListMetadata>(metadataKey);
  if (cached) {
    return cached;
  }

  return buildLegacyListMetadata(key);
};

const extractSnapshotPayload = <T>(payload: unknown): CachedListPayload<T> | null => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as PaginatedResult<T[]>;
    if (Array.isArray(candidate.snapshot)) {
      return candidate;
    }
  }

  return null;
};

const resolveItemId = <T extends Record<string, any>>(
  item: T,
  idSelector?: (item: T) => string | null | undefined
): string | null => {
  const rawId = idSelector ? idSelector(item) : item.id;
  if (typeof rawId !== "string") return null;

  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getItemIdFromList = (item: Record<string, any>): string | null => {
  if (typeof item.id !== "string") return null;

  const trimmed = item.id.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mutateSnapshot = <T extends Record<string, any>>(
  payload: CachedListPayload<T>,
  mutator: (snapshot: T[]) => {snapshot: T[]; paginationImpacted: boolean} | null
): {payload: CachedListPayload<T>; paginationImpacted: boolean} | null => {
  if (Array.isArray(payload)) {
    const result = mutator(payload);
    if (!result) return null;
    return {
      payload: result.snapshot,
      paginationImpacted: result.paginationImpacted,
    };
  }

  const result = mutator(payload.snapshot);
  if (!result) return null;

  return {
    payload: {
      ...payload,
      snapshot: result.snapshot,
    },
    paginationImpacted: result.paginationImpacted,
  };
};

const upsertSnapshot = <T extends Record<string, any>>(
  snapshot: T[],
  item: T,
  itemId: string
): {snapshot: T[]; paginationImpacted: boolean} => {
  const existingIndex = snapshot.findIndex((candidate) => getItemIdFromList(candidate) === itemId);
  if (existingIndex >= 0) {
    const nextSnapshot = snapshot.slice();
    nextSnapshot[existingIndex] = item;
    return {snapshot: nextSnapshot, paginationImpacted: false};
  }

  return {
    snapshot: [item, ...snapshot],
    paginationImpacted: true,
  };
};

const replaceSnapshot = <T extends Record<string, any>>(
  snapshot: T[],
  item: T,
  itemId: string
): {snapshot: T[]; paginationImpacted: boolean} | null => {
  const existingIndex = snapshot.findIndex((candidate) => getItemIdFromList(candidate) === itemId);
  if (existingIndex < 0) return null;

  const nextSnapshot = snapshot.slice();
  nextSnapshot[existingIndex] = item;
  return {snapshot: nextSnapshot, paginationImpacted: false};
};

const removeSnapshotItem = <T extends Record<string, any>>(
  snapshot: T[],
  itemId: string
): {snapshot: T[]; paginationImpacted: boolean} | null => {
  const existingIndex = snapshot.findIndex((candidate) => getItemIdFromList(candidate) === itemId);
  if (existingIndex < 0) return null;

  return {
    snapshot: snapshot.filter((candidate) => getItemIdFromList(candidate) !== itemId),
    paginationImpacted: true,
  };
};

async function rewriteListCacheEntry<T extends Record<string, any>>(
  key: string,
  mutator: (snapshot: T[]) => {snapshot: T[]; paginationImpacted: boolean} | null
): Promise<{mutated: boolean; paginationImpacted: boolean}> {
  const cachedPayload = await getCache<unknown>(key);
  if (cachedPayload === null) {
    return {mutated: false, paginationImpacted: false};
  }

  const payload = extractSnapshotPayload<T>(cachedPayload);
  if (!payload) {
    return {mutated: false, paginationImpacted: false};
  }

  const result = mutateSnapshot(payload, mutator);
  if (!result) {
    return {mutated: false, paginationImpacted: false};
  }

  const metadata = await getCachedListMetadataByKey(key);
  const ttl = metadata.ttl || DEFAULT_LIST_TTL_SECONDS;
  await Promise.all([
    setCache(key, result.payload as T[] | PaginatedResult<T[]>, ttl),
    setCache(
      generateListMetadataCacheKey(key),
      {
        ...metadata,
        cachedAt: Date.now(),
        ttl,
        legacy: false,
      },
      ttl
    ),
  ]);

  return {
    mutated: true,
    paginationImpacted: result.paginationImpacted,
  };
}

export async function getCachedListMetadata(resource: string, query?: Record<string, any>): Promise<CachedListMetadata> {
  const key = generateListCacheKey(resource, query);
  return getCachedListMetadataByKey(key);
}

export async function getCachedListKeys(resource: string): Promise<string[]> {
  const keys = await getCacheKeys(`${resource}:list:*`);
  return keys.filter((key) => !key.endsWith(LIST_METADATA_SUFFIX)).sort();
}

export async function getCachedListDescriptors(resource: string): Promise<CachedListDescriptor[]> {
  const keys = await getCachedListKeys(resource);
  return Promise.all(
    keys.map(async (key) => ({
      key,
      metadata: await getCachedListMetadataByKey(key),
    }))
  );
}

export async function upsertCachedListItem<T extends Record<string, any>>(
  resource: string,
  item: T,
  options: CachedListMutationOptions<T> = {}
): Promise<CachedListMutationSummary> {
  const summary: CachedListMutationSummary = {
    mutatedKeys: [],
    skippedKeys: [],
    unsupportedKeys: [],
    paginationImpactedKeys: [],
  };

  const itemId = resolveItemId(item, options.idSelector);
  if (!itemId) {
    summary.unsupportedKeys = await getCachedListKeys(resource);
    return summary;
  }

  const descriptors = await getCachedListDescriptors(resource);
  for (const descriptor of descriptors) {
    const shouldMutate = options.shouldMutate ?? ((entry: CachedListDescriptor) => shouldMutateCachedList(entry.metadata.resource, entry.metadata.query));
    if (!shouldMutate(descriptor)) {
      summary.skippedKeys.push(descriptor.key);
      continue;
    }

    const result = await rewriteListCacheEntry<T>(descriptor.key, (snapshot) => upsertSnapshot(snapshot, item, itemId));
    if (result.mutated) {
      summary.mutatedKeys.push(descriptor.key);
      if (result.paginationImpacted) {
        summary.paginationImpactedKeys.push(descriptor.key);
      }
    }
  }

  return summary;
}

export async function replaceCachedListItem<T extends Record<string, any>>(
  resource: string,
  id: string,
  item: T,
  options: CachedListMutationOptions<T> = {}
): Promise<CachedListMutationSummary> {
  const summary: CachedListMutationSummary = {
    mutatedKeys: [],
    skippedKeys: [],
    unsupportedKeys: [],
    paginationImpactedKeys: [],
  };

  const trimmedId = id.trim();
  if (!trimmedId) {
    summary.unsupportedKeys = await getCachedListKeys(resource);
    return summary;
  }

  const descriptors = await getCachedListDescriptors(resource);
  for (const descriptor of descriptors) {
    const shouldMutate = options.shouldMutate ?? ((entry: CachedListDescriptor) => shouldMutateCachedList(entry.metadata.resource, entry.metadata.query));
    if (!shouldMutate(descriptor)) {
      summary.skippedKeys.push(descriptor.key);
      continue;
    }

    const result = await rewriteListCacheEntry<T>(descriptor.key, (snapshot) => replaceSnapshot(snapshot, item, trimmedId));
    if (result.mutated) {
      summary.mutatedKeys.push(descriptor.key);
      if (result.paginationImpacted) {
        summary.paginationImpactedKeys.push(descriptor.key);
      }
    }
  }

  return summary;
}

export async function removeCachedListItem(
  resource: string,
  id: string,
  options: CachedListMutationOptions<Record<string, any>> = {}
): Promise<CachedListMutationSummary> {
  const summary: CachedListMutationSummary = {
    mutatedKeys: [],
    skippedKeys: [],
    unsupportedKeys: [],
    paginationImpactedKeys: [],
  };

  const trimmedId = id.trim();
  if (!trimmedId) {
    summary.unsupportedKeys = await getCachedListKeys(resource);
    return summary;
  }

  const descriptors = await getCachedListDescriptors(resource);
  for (const descriptor of descriptors) {
    const shouldMutate = options.shouldMutate ?? ((entry: CachedListDescriptor) => shouldMutateCachedList(entry.metadata.resource, entry.metadata.query));
    if (!shouldMutate(descriptor)) {
      summary.skippedKeys.push(descriptor.key);
      continue;
    }

    const result = await rewriteListCacheEntry<Record<string, any>>(descriptor.key, (snapshot) => removeSnapshotItem(snapshot, trimmedId));
    if (result.mutated) {
      summary.mutatedKeys.push(descriptor.key);
      if (result.paginationImpacted) {
        summary.paginationImpactedKeys.push(descriptor.key);
      }
    }
  }

  return summary;
}

/**
 * Cache a list result (GET operations)
 * For paginated lists, we cache each page separately using the query params
 */
export async function cacheList<T extends object>(
  resource: string,
  data: T,
  query?: Record<string, any>,
  options: CacheOptions = {}
): Promise<void> {
  const {ttl = 300, useCache = true} = options;
  if (!useCache) return; // Skip caching if disabled
  const key = generateListCacheKey(resource, query);
  const metadata: CachedListMetadata = {
    resource,
    key,
    query: normalizeListQuery(query),
    ttl,
    cachedAt: Date.now(),
  };

  await Promise.all([
    setCache(key, data, ttl),
    setCache(generateListMetadataCacheKey(key), metadata, ttl),
  ]);
  devLog(`[SmartCache] WRITE list: ${key}`);
}

/**
 * Get cached list result
 */
export async function getCachedList<T extends object>(
  resource: string,
  query?: Record<string, any>,
  options: CacheOptions = {}
): Promise<T | null> {
  const {useCache = true} = options;
  if (!useCache) return null; // Skip cache check if disabled
  const key = generateListCacheKey(resource, query);
  const cached = await getCache<T>(key);
  if (cached) {
    devLog(`[SmartCache] HIT list: ${key}`);
  } else {
    devLog(`[SmartCache] MISS list: ${key}`);
  }
  return cached;
}

/**
 * Cache a single item result (GET by ID operations)
 */
export async function cacheItem<T extends object>(
  resource: string,
  id: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const {ttl = 300, useCache = true} = options;
  if (!useCache) return; // Skip caching if disabled
  const key = generateItemCacheKey(resource, id);
  await setCache(key, data, ttl);
  devLog(`[SmartCache] WRITE item: ${key}`);
}

/**
 * Get cached item result
 */
export async function getCachedItem<T extends object>(
  resource: string,
  id: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const {useCache = true} = options;
  if (!useCache) return null; // Skip cache check if disabled
  const key = generateItemCacheKey(resource, id);
  const cached = await getCache<T>(key);
  if (cached) {
    devLog(`[SmartCache] HIT item: ${key}`);
  } else {
    devLog(`[SmartCache] MISS item: ${key}`);
  }
  return cached;
}

/**
 * Cache a count result
 */
export async function cacheCount(
  resource: string,
  count: number,
  suffix?: string,
  options: CacheOptions = {}
): Promise<void> {
  const {ttl = 300} = options;
  const key = generateCountCacheKey(resource, suffix);
  await setCache(key, {count}, ttl);
  devLog(`[SmartCache] WRITE count: ${key}`);
}

/**
 * Get cached count result
 */
export async function getCachedCount(
  resource: string,
  suffix?: string
): Promise<number | null> {
  const key = generateCountCacheKey(resource, suffix);
  const cached = await getCache<{count: number}>(key);
  if (cached) {
    devLog(`[SmartCache] Hit count: ${key}`);
    return cached.count;
  }
  return null;
}

/**
 * Invalidate a specific item cache (for PATCH/DELETE operations)
 */
export async function invalidateItem(resource: string, id: string): Promise<void> {
  const key = generateItemCacheKey(resource, id);
  await deleteCache(key);
  devLog(`[SmartCache] Invalidated item: ${key}`);
}

/**
 * Invalidate a specific count cache for a resource.
 */
export async function invalidateCount(resource: string, suffix?: string): Promise<void> {
  const key = generateCountCacheKey(resource, suffix);
  await deleteCache(key);
  devLog(`[SmartCache] Invalidated count: ${key}`);
}

/**
 * Invalidate all list caches for a resource (for POST/DELETE operations)
 * This clears all paginated and filtered list caches
 */
export async function invalidateAllLists(resource: string): Promise<void> {
  const pattern = `${resource}:list:*`;
  await deleteCachePattern(pattern);
  devLog(`[SmartCache] Invalidated all lists: ${pattern}`);
}

/**
 * Invalidate all count caches for a resource
 */
export async function invalidateAllCounts(resource: string): Promise<void> {
  const pattern = `${resource}:count*`;
  await deleteCachePattern(pattern);
  devLog(`[SmartCache] Invalidated all counts: ${pattern}`);
}

/**
 * Invalidate everything for a resource (item, lists, counts)
 */
export async function invalidateResource(resource: string): Promise<void> {
  const pattern = `${resource}:*`;
  await deleteCachePattern(pattern);
  devLog(`[SmartCache] Invalidated resource: ${pattern}`);
}

/**
 * Helper for POST operations - invalidates list and count caches
 */
export async function handlePostCache(resource: string): Promise<void> {
  await Promise.all([
    invalidateAllLists(resource),
    invalidateAllCounts(resource),
  ]);
  devLog(`[SmartCache] Handled POST for: ${resource}`);
}

/**
 * Helper for PATCH operations - invalidates specific item and optionally lists
 * @param invalidateLists - If true, also invalidate list caches (useful if PATCH changes sortable fields)
 */
export async function handlePatchCache(
  resource: string,
  id: string,
  invalidateLists = false
): Promise<void> {
  await invalidateItem(resource, id);
  if (invalidateLists) {
    await invalidateAllLists(resource);
  }
  devLog(`[SmartCache] Handled PATCH for: ${resource}:${id} (lists: ${invalidateLists})`);
}

/**
 * Helper for DELETE operations - invalidates item, lists, and counts
 */
export async function handleDeleteCache(resource: string, id: string): Promise<void> {
  await Promise.all([
    invalidateItem(resource, id),
    invalidateAllLists(resource),
    invalidateAllCounts(resource),
  ]);
  devLog(`[SmartCache] Handled DELETE for: ${resource}:${id}`);
}

/**
 * Wrapper function for caching GET operations with automatic cache checking
 */
export async function withCache<T extends object>(
  resource: string,
  id: string | undefined,
  query: Record<string, any> | undefined,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  let cached: T | null = null;

  if (id) {
    // Single item query
    cached = await getCachedItem<T>(resource, id);
  } else {
    // List query
    cached = await getCachedList<T>(resource, query);
  }

  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const result = await fetchFn();

  // Store in cache
  if (id) {
    await cacheItem(resource, id, result, options);
  } else {
    await cacheList(resource, result, query, options);
  }

  return result;
}
