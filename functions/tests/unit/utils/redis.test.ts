import { describe, it, expect, afterAll, jest, beforeEach } from "@jest/globals";

// Mock the redis config BEFORE importing the utils
jest.mock("../../../src/configs/redis", () => {
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockDel = jest.fn();
  const mockScan = jest.fn();
  const mockQuit = jest.fn(async () => true);
  const mockDestroy = jest.fn(async () => true);

  const mockRedisInstance = {
    isOpen: true,
    get: mockGet,
    set: mockSet,
    del: mockDel,
    scan: mockScan,
    quit: mockQuit,
    destroy: mockDestroy,
  };

  return {
    redis: mockRedisInstance,
    redisReady: Promise.resolve(),
    ensureRedisConnection: jest.fn(async () => mockRedisInstance),
  };
});

// Import redis config and utils AFTER the mock
import { redis } from "../../../src/configs/redis";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
} from "../../../src/utils/redis";

describe("redis utils (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify({ foo: "bar" }));
    (redis.set as jest.Mock).mockResolvedValue("OK");
    (redis.del as jest.Mock).mockResolvedValue(1);
    (redis.scan as jest.Mock).mockResolvedValue({ cursor: "0", keys: ["test"] });
  });

  it("should set cache", async () => {
    await expect(setCache("test", { foo: "bar" }, 60)).resolves.toBeUndefined();
    expect(redis.set).toHaveBeenCalledWith(
      "test",
      JSON.stringify({ foo: "bar" }),
      { EX: 60 }
    );
  });

  it("should get cache", async () => {
    const result = await getCache<{ foo: string }>("test");
    expect(result).toEqual({ foo: "bar" });
    expect(redis.get).toHaveBeenCalledWith("test");
  });

  it("should delete cache", async () => {
    await expect(deleteCache("test")).resolves.toBeUndefined();
    expect(redis.del).toHaveBeenCalledWith("test");
  });

  it("should delete cache by pattern", async () => {
    await expect(deleteCachePattern("test*")).resolves.toBeUndefined();
    expect(redis.scan).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(["test"]);
  });

  afterAll(async () => {
    if (redis && redis.isOpen) {
      await redis.quit();
    }
  });
});
