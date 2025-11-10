import {devLog} from "../../src/utils/dev";
import {describe, it, expect} from "@jest/globals";

describe("dev utils (unit)", () => {
  it("should log error in non-prod", () => {
    expect(() => devLog("test error")).not.toThrow();
  });
});
