import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as cacheManager from "../../../src/utils/cacheManager";

// Mock redis functions
jest.mock("../../../src/utils/redis", () => ({
  getCache: jest.fn() as jest.MockedFunction<any>,
  setCache: jest.fn() as jest.MockedFunction<any>,
  deleteCache: jest.fn() as jest.MockedFunction<any>,
  deleteCachePattern: jest.fn() as jest.MockedFunction<any>,
  getCacheKeys: jest.fn() as jest.MockedFunction<any>,
}));
jest.mock("../../../src/utils/dev");

import { getCache, setCache, deleteCache, deleteCachePattern, getCacheKeys } from "../../../src/utils/redis";

const mockGetCache = getCache as jest.MockedFunction<any>;
const mockSetCache = setCache as jest.MockedFunction<any>;
const mockDeleteCache = deleteCache as jest.MockedFunction<any>;
const mockDeleteCachePattern = deleteCachePattern as jest.MockedFunction<any>;
const mockGetCacheKeys = getCacheKeys as jest.MockedFunction<any>;

describe("cacheManager utils (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateListCacheKey", () => {
    it("should generate key for list with no query", () => {
      const key = cacheManager.generateListCacheKey("users");
      expect(key).toBe("users:list:all");
    });

    it("should generate key for list with query params", () => {
      const key = cacheManager.generateListCacheKey("users", { limit: 10, page: 2 });
      expect(key).toContain("users:list:");
      expect(key).not.toBe("users:list:all");
    });

    it("should generate consistent keys for same query", () => {
      const key1 = cacheManager.generateListCacheKey("users", { a: 1, b: 2 });
      const key2 = cacheManager.generateListCacheKey("users", { b: 2, a: 1 });
      expect(key1).toBe(key2); // Should be same regardless of param order
    });
  });

  describe("generateItemCacheKey", () => {
    it("should generate key for specific item", () => {
      const key = cacheManager.generateItemCacheKey("users", "user123");
      expect(key).toBe("users:item:user123");
    });
  });

  describe("generateCountCacheKey", () => {
    it("should generate key for count without suffix", () => {
      const key = cacheManager.generateCountCacheKey("users");
      expect(key).toBe("users:count");
    });

    it("should generate key for count with suffix", () => {
      const key = cacheManager.generateCountCacheKey("users", "active");
      expect(key).toBe("users:count:active");
    });
  });

  describe("getCachedListMutationPolicy", () => {
    it("should mark stable report lists as mutable", () => {
      const policy = cacheManager.getCachedListMutationPolicy("mold-reports-all");

      expect(policy.kind).toBe("mutate");
    });

    it("should fall back for derived search lists", () => {
      const policy = cacheManager.getCachedListMutationPolicy("mold-reports-search", {search: "rice"});

      expect(policy.kind).toBe("fallback");
    });
  });

  describe("cacheList", () => {
    it("should cache list data", async () => {
      mockSetCache.mockResolvedValue(undefined);
      const data = { items: [1, 2, 3] };

      await cacheManager.cacheList("users", data);

      expect(mockSetCache).toHaveBeenCalledTimes(2);
      expect(mockSetCache).toHaveBeenCalledWith("users:list:all", data, 300);
      expect(mockSetCache).toHaveBeenCalledWith(
        cacheManager.generateListMetadataCacheKey("users:list:all"),
        expect.objectContaining({
          resource: "users",
          key: "users:list:all",
          query: null,
          ttl: 300,
          cachedAt: expect.any(Number),
        }),
        300
      );
    });

    it("should skip caching if useCache is false", async () => {
      await cacheManager.cacheList("users", { items: [] }, undefined, { useCache: false });

      expect(mockSetCache).not.toHaveBeenCalled();
    });

    it("should use custom TTL", async () => {
      mockSetCache.mockResolvedValue(undefined);
      await cacheManager.cacheList("users", { items: [] }, undefined, { ttl: 600 });

      expect(mockSetCache).toHaveBeenCalledTimes(2);
      expect(mockSetCache).toHaveBeenCalledWith("users:list:all", { items: [] }, 600);
      expect(mockSetCache).toHaveBeenCalledWith(
        cacheManager.generateListMetadataCacheKey("users:list:all"),
        expect.objectContaining({
          resource: "users",
          key: "users:list:all",
          ttl: 600,
        }),
        600
      );
    });
  });

  describe("getCachedList", () => {
    it("should return cached list if exists", async () => {
      const cachedData = { items: [1, 2, 3] };
      mockGetCache.mockResolvedValue(cachedData);

      const result = await cacheManager.getCachedList("users");

      expect(result).toEqual(cachedData);
    });

    it("should return null if not cached", async () => {
      mockGetCache.mockResolvedValue(null);

      const result = await cacheManager.getCachedList("users");

      expect(result).toBeNull();
    });

    it("should skip cache check if useCache is false", async () => {
      const result = await cacheManager.getCachedList("users", undefined, { useCache: false });

      expect(mockGetCache).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("getCachedListMetadata", () => {
    it("should return cached list metadata if exists", async () => {
      const metadata = {
        resource: "users",
        key: "users:list:all",
        query: null,
        ttl: 300,
        cachedAt: 123,
      };
      mockGetCache.mockResolvedValue(metadata);

      const result = await cacheManager.getCachedListMetadata("users");

      expect(result).toEqual(metadata);
    });
  });

  describe("getCachedListKeys", () => {
    it("should filter out metadata keys", async () => {
      mockGetCacheKeys.mockResolvedValue([
        "users:list:all",
        "users:list:all:meta",
        "users:list:abc",
        "users:list:abc:meta",
      ]);

      const keys = await cacheManager.getCachedListKeys("users");

      expect(keys).toEqual(["users:list:abc", "users:list:all"]);
    });
  });

  describe("upsertCachedListItem", () => {
    it("should insert new item into cached list snapshots", async () => {
      const listKey = "users:list:all";
      const metadataKey = cacheManager.generateListMetadataCacheKey(listKey);
      mockGetCacheKeys.mockResolvedValue([listKey]);
      mockGetCache
        .mockResolvedValueOnce({
          resource: "users",
          key: listKey,
          query: null,
          ttl: 300,
          cachedAt: 123,
        })
        .mockResolvedValueOnce({snapshot: [{id: "1", name: "Alpha"}], nextPageToken: "next"});
      mockSetCache.mockResolvedValue(undefined);

      const result = await cacheManager.upsertCachedListItem("users", {id: "2", name: "Beta"});

      expect(result.mutatedKeys).toEqual([listKey]);
      expect(result.paginationImpactedKeys).toEqual([listKey]);
      expect(mockSetCache).toHaveBeenCalledWith(
        listKey,
        {snapshot: [{id: "2", name: "Beta"}, {id: "1", name: "Alpha"}], nextPageToken: "next"},
        300
      );
      expect(mockSetCache).toHaveBeenCalledWith(
        metadataKey,
        expect.objectContaining({
          resource: "users",
          key: listKey,
          legacy: false,
        }),
        300
      );
    });
  });

  describe("replaceCachedListItem", () => {
    it("should replace existing item in cached list snapshots", async () => {
      const listKey = "users:list:all";
      mockGetCacheKeys.mockResolvedValue([listKey]);
      mockGetCache
        .mockResolvedValueOnce({
          resource: "users",
          key: listKey,
          query: null,
          ttl: 300,
          cachedAt: 123,
        })
        .mockResolvedValueOnce({snapshot: [{id: "1", name: "Alpha"}], nextPageToken: null});
      mockSetCache.mockResolvedValue(undefined);

      const result = await cacheManager.replaceCachedListItem("users", "1", {id: "1", name: "Updated"});

      expect(result.mutatedKeys).toEqual([listKey]);
      expect(result.paginationImpactedKeys).toHaveLength(0);
      expect(mockSetCache).toHaveBeenCalledWith(
        listKey,
        {snapshot: [{id: "1", name: "Updated"}], nextPageToken: null},
        300
      );
    });
  });

  describe("removeCachedListItem", () => {
    it("should remove item from cached list snapshots", async () => {
      const listKey = "users:list:all";
      mockGetCacheKeys.mockResolvedValue([listKey]);
      mockGetCache
        .mockResolvedValueOnce({
          resource: "users",
          key: listKey,
          query: null,
          ttl: 300,
          cachedAt: 123,
        })
        .mockResolvedValueOnce({snapshot: [{id: "1", name: "Alpha"}, {id: "2", name: "Beta"}], nextPageToken: "next"});
      mockSetCache.mockResolvedValue(undefined);

      const result = await cacheManager.removeCachedListItem("users", "1");

      expect(result.mutatedKeys).toEqual([listKey]);
      expect(result.paginationImpactedKeys).toEqual([listKey]);
      expect(mockSetCache).toHaveBeenCalledWith(
        listKey,
        {snapshot: [{id: "2", name: "Beta"}], nextPageToken: "next"},
        300
      );
    });
  });

  describe("cacheItem", () => {
    it("should cache item data", async () => {
      mockSetCache.mockResolvedValue(undefined);
      const data = { name: "John" };

      await cacheManager.cacheItem("users", "user123", data);

      expect(mockSetCache).toHaveBeenCalledWith("users:item:user123", data, 300);
    });
  });

  describe("getCachedItem", () => {
    it("should return cached item if exists", async () => {
      const cachedData = { name: "John" };
      mockGetCache.mockResolvedValue(cachedData);

      const result = await cacheManager.getCachedItem("users", "user123");

      expect(result).toEqual(cachedData);
    });
  });

  describe("cacheCount", () => {
    it("should cache count data", async () => {
      mockSetCache.mockResolvedValue(undefined);

      await cacheManager.cacheCount("users", 42);

      expect(mockSetCache).toHaveBeenCalledWith("users:count", { count: 42 }, 300);
    });

    it("should cache count with suffix", async () => {
      mockSetCache.mockResolvedValue(undefined);

      await cacheManager.cacheCount("users", 10, "active");

      expect(mockSetCache).toHaveBeenCalledWith("users:count:active", { count: 10 }, 300);
    });
  });

  describe("getCachedCount", () => {
    it("should return cached count if exists", async () => {
      mockGetCache.mockResolvedValue({ count: 42 });

      const result = await cacheManager.getCachedCount("users");

      expect(result).toBe(42);
    });

    it("should return null if not cached", async () => {
      mockGetCache.mockResolvedValue(null);

      const result = await cacheManager.getCachedCount("users");

      expect(result).toBeNull();
    });
  });

  describe("invalidateItem", () => {
    it("should delete item cache", async () => {
      mockDeleteCache.mockResolvedValue(undefined);

      await cacheManager.invalidateItem("users", "user123");

      expect(mockDeleteCache).toHaveBeenCalledWith("users:item:user123");
    });
  });

  describe("invalidateAllLists", () => {
    it("should delete all list caches", async () => {
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.invalidateAllLists("users");

      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:list:*");
    });
  });

  describe("invalidateAllCounts", () => {
    it("should delete all count caches", async () => {
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.invalidateAllCounts("users");

      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:count*");
    });
  });

  describe("invalidateResource", () => {
    it("should delete all caches for resource", async () => {
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.invalidateResource("users");

      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:*");
    });
  });

  describe("handlePostCache", () => {
    it("should invalidate lists and counts", async () => {
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.handlePostCache("users");

      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:list:*");
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:count*");
    });
  });

  describe("handlePatchCache", () => {
    it("should invalidate item only", async () => {
      mockDeleteCache.mockResolvedValue(undefined);
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.handlePatchCache("users", "user123", false);

      expect(mockDeleteCache).toHaveBeenCalledWith("users:item:user123");
      expect(mockDeleteCachePattern).not.toHaveBeenCalled();
    });

    it("should invalidate item and lists", async () => {
      mockDeleteCache.mockResolvedValue(undefined);
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.handlePatchCache("users", "user123", true);

      expect(mockDeleteCache).toHaveBeenCalledWith("users:item:user123");
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:list:*");
    });
  });

  describe("handleDeleteCache", () => {
    it("should invalidate item, lists, and counts", async () => {
      mockDeleteCache.mockResolvedValue(undefined);
      mockDeleteCachePattern.mockResolvedValue(undefined);

      await cacheManager.handleDeleteCache("users", "user123");

      expect(mockDeleteCache).toHaveBeenCalledWith("users:item:user123");
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:list:*");
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("users:count*");
    });
  });

  describe("withCache", () => {
    it("should return cached item if exists", async () => {
      const cachedData = { name: "John" };
      mockGetCache.mockResolvedValue(cachedData);

      const fetchFn = jest.fn();
      const result = await cacheManager.withCache("users", "user123", undefined, fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("should fetch and cache if not exists", async () => {
      const fetchedData = { name: "John" };
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue(undefined);
      const fetchFn = jest.fn().mockResolvedValue(fetchedData);

      const result = await cacheManager.withCache("users", "user123", undefined, fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(mockSetCache).toHaveBeenCalledWith("users:item:user123", fetchedData, 300);
      expect(result).toEqual(fetchedData);
    });

    it("should handle list queries", async () => {
      const fetchedData = { items: [1, 2, 3] };
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue(undefined);
      const fetchFn = jest.fn().mockResolvedValue(fetchedData);

      const result = await cacheManager.withCache("users", undefined, { limit: 10 }, fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(mockSetCache).toHaveBeenCalled();
      expect(result).toEqual(fetchedData);
    });
  });
});
