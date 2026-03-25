import {beforeEach, describe, expect, it, jest} from "@jest/globals";

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("../../../src/configs/logger", () => ({
  logger: mockLogger,
}));

jest.mock("../../../src/utils/dev", () => ({
  devLog: jest.fn(),
}));

jest.mock("../../../src/configs/environment", () => ({
  envOptions: {
    lambdaUrl: "https://example.execute-api.ap-southeast-1.amazonaws.com/default/",
    modelInternalKey: "secret-key",
  },
}));

const makeResponse = (status: number, body: unknown): Response => ({
  status,
  text: async () => JSON.stringify(body),
} as unknown as Response);

describe("modelProxyService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("prefers v3 path without /api prefix on first attempt", async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeResponse(200, {fusion: {predicted_class: 1}}));
    (global as any).fetch = mockFetch;

    const {proxyJsonPredict} = require("../../../src/services/modelProxyService");

    const result = await proxyJsonPredict({image_b64: "abc123"});

    expect(result.status).toBe(200);
    expect((result.body as Record<string, unknown>)._model_source).toBe("fusion");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("/default/v3/predict");
    expect(mockFetch.mock.calls[0][0]).toContain("internal_key=secret-key");
    expect(mockFetch.mock.calls[0][1].headers["X-Internal-Key"]).toBe("secret-key");
  });

  it("retries with fallback path after first 404 and avoids warning severity", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(404, {error: "not found"}))
      .mockResolvedValueOnce(makeResponse(200, {fusion: {predicted_class: 2}}));
    (global as any).fetch = mockFetch;

    const {proxyJsonPredict} = require("../../../src/services/modelProxyService");

    const result = await proxyJsonPredict({image_b64: "abc123"});

    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain("/default/v3/predict");
    expect(mockFetch.mock.calls[1][0]).toContain("/default/api/v3/predict");
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.anything(),
      "Upstream returned 404 for endpoint path; trying next path candidate"
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({attempt: 1, resolvedPath: "v3/predict"}),
      "Upstream returned 404 for preferred endpoint path; trying fallback candidate"
    );
  });

  it("redacts internal_key in logged upstream URL", async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeResponse(200, {fusion: {predicted_class: 3}}));
    (global as any).fetch = mockFetch;

    const {proxyJsonPredict} = require("../../../src/services/modelProxyService");

    await proxyJsonPredict({image_b64: "abc123"});

    const loggedPayload = mockLogger.info.mock.calls[0][0] as Record<string, unknown>;
    expect(String(loggedPayload.url)).toContain("internal_key=%5BREDACTED%5D");
    expect(String(loggedPayload.url)).not.toContain("secret-key");
  });
});
