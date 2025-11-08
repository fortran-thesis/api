import {getCache, setCache, deleteCache, deleteCachePattern} from "./redis";
import {devLog} from "./dev";

/**
 * Cache Manager for modular Redis caching
 * 
 * Cache Key Patterns:
 * - List: `{resource}:list:{query_params_hash}` (e.g., "users:list:abc123")
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
  
  // Create a hash from query params
  const queryString = JSON.stringify(sortedQuery);
  const hash = Buffer.from(queryString).toString("base64").substring(0, 16);
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
  await setCache(key, data, ttl);
  devLog(`[CACHE] Cached list: ${key}`);
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
    devLog(`[CACHE] Hit list: ${key}`);
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
  devLog(`[CACHE] Cached item: ${key}`);
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
    devLog(`[CACHE] Hit item: ${key}`);
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
  devLog(`[CACHE] Cached count: ${key}`);
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
    devLog(`[CACHE] Hit count: ${key}`);
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
  devLog(`[CACHE] Invalidated item: ${key}`);
}

/**
 * Invalidate all list caches for a resource (for POST/DELETE operations)
 * This clears all paginated and filtered list caches
 */
export async function invalidateAllLists(resource: string): Promise<void> {
  const pattern = `${resource}:list:*`;
  await deleteCachePattern(pattern);
  devLog(`[CACHE] Invalidated all lists: ${pattern}`);
}

/**
 * Invalidate all count caches for a resource
 */
export async function invalidateAllCounts(resource: string): Promise<void> {
  const pattern = `${resource}:count*`;
  await deleteCachePattern(pattern);
  devLog(`[CACHE] Invalidated all counts: ${pattern}`);
}

/**
 * Invalidate everything for a resource (item, lists, counts)
 */
export async function invalidateResource(resource: string): Promise<void> {
  const pattern = `${resource}:*`;
  await deleteCachePattern(pattern);
  devLog(`[CACHE] Invalidated resource: ${pattern}`);
}

/**
 * Helper for POST operations - invalidates list and count caches
 */
export async function handlePostCache(resource: string): Promise<void> {
  await Promise.all([
    invalidateAllLists(resource),
    invalidateAllCounts(resource),
  ]);
  devLog(`[CACHE] Handled POST for: ${resource}`);
}

/**
 * Helper for PATCH operations - invalidates specific item and optionally lists
 * @param invalidateLists - If true, also invalidate list caches (useful if PATCH changes sortable fields)
 */
export async function handlePatchCache(
  resource: string,
  id: string,
  invalidateLists: boolean = false
): Promise<void> {
  await invalidateItem(resource, id);
  if (invalidateLists) {
    await invalidateAllLists(resource);
  }
  devLog(`[CACHE] Handled PATCH for: ${resource}:${id} (lists: ${invalidateLists})`);
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
  devLog(`[CACHE] Handled DELETE for: ${resource}:${id}`);
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
