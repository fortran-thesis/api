import { concurrent } from "../../../src/utils/concurrent";
import { describe, it, expect } from "@jest/globals";

describe("concurrent utils (unit)", () => {
  it("should run concurrent tasks", async () => {
    const tasks = [async () => 1, async () => 2];
    const results = await concurrent(...tasks.map((fn) => fn()));
    expect(results).toBeDefined();
  });

  it("should resolve all promises", async () => {
    const p1 = Promise.resolve(1);
    const p2 = Promise.resolve(2);
    const results = await concurrent(p1, p2);
    expect(results).toEqual([1, 2]);
  });

  it("should handle no promises", async () => {
    const results = await concurrent();
    expect(results).toEqual([]);
  });

  it("should handle rejected promises", async () => {
    const p1 = Promise.resolve(1);
    const p2 = Promise.reject(new Error("fail"));
    await expect(concurrent(p1, p2)).rejects.toThrow("fail");
  });
});
