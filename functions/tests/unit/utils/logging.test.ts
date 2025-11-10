import { computeDiff } from "../../../src/utils/logging";
import { describe, it, expect } from "@jest/globals";

describe("logging utils (unit)", () => {
  it("should compute diff between objects", () => {
    const oldObj = { a: 1, b: 2 };
    const newObj = { a: 1, b: 3 };
    const diff = computeDiff(oldObj, newObj);
    expect(diff).toEqual({ b: { old: 2, new: 3 } });
  });

  it("should return empty object if no changes", () => {
    const obj = { a: 1 };
    expect(computeDiff(obj, obj)).toEqual({});
  });
});
