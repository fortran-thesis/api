import {describe, expect, it} from "@jest/globals";
import {limitingOptions, lookupLimiter} from "../../../src/configs/limit";

describe("rate limit bypass for JMeter load tests", () => {
  it("skips rate limiting when x-rate-limit-key is present", () => {
    const req = {headers: {"x-rate-limit-key": "admin-1"}};

    expect(limitingOptions.skip?.(req as any)).toBe(true);
    expect(lookupLimiter.skip?.(req as any)).toBe(true);
  });

  it("skips rate limiting for the synthetic JMeter forwarded IP range", () => {
    const req = {headers: {"x-forwarded-for": "10.42.2.17"}};

    expect(limitingOptions.skip?.(req as any)).toBe(true);
  });

  it("skips rate limiting for the default Apache HttpClient user agent", () => {
    const req = {headers: {"user-agent": "Apache-HttpClient/4.5.14 (Java/21.0.2)"}};

    expect(limitingOptions.skip?.(req as any)).toBe(true);
  });

  it("does not skip normal browser requests", () => {
    const req = {headers: {"user-agent": "Mozilla/5.0"}};

    expect(limitingOptions.skip?.(req as any)).toBe(false);
  });
});