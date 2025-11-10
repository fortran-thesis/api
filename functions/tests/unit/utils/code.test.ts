import { generateCode } from "../../../src/utils/code";
import { describe, it, expect } from "@jest/globals";

describe("code utils (unit)", () => {
  it("should generate a 4-digit code as a string", () => {
    const code = generateCode();
    expect(typeof code).toBe("string");
    expect(code).toHaveLength(4);
    expect(Number.isNaN(Number(code))).toBe(false);
  });

  it("should always return a string of length 4", () => {
    for (let i = 0; i < 10; i++) {
      expect(generateCode()).toHaveLength(4);
    }
  });

  it("should return only digits", () => {
    const code = generateCode();
    expect(/^[0-9]{4}$/.test(code)).toBe(true);
  });
});
