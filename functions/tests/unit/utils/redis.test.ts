import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
} from "../../../src/utils/redis";
import { describe, it, expect, afterAll, jest } from "@jest/globals";
jest.mock("../../../src/configs/redis", () => ({
  redis: {
    isOpen: true,
    get: jest.fn(async (key) =>
      key === "test" ? JSON.stringify({ foo: "bar" }) : null
    ),
    set: jest.fn(async () => true),
    del: jest.fn(async () => true),
    scan: jest.fn(async () => ({ cursor: "0", keys: ["test"] })),
    quit: jest.fn(async () => true),
    destroy: jest.fn(async () => true),
  },
  redisReady: Promise.resolve(),
  ensureRedisConnection: jest.fn(async () => {}),
}));

import { redis } from "../../../src/configs/redis";

describe("redis utils (unit)", () => {
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
