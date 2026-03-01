/**
 * Integration Tests — Middleware & General
 *
 * Smoke tests for cross-cutting concerns:
 * - Authentication middleware (verifyUser)
 * - Rate limiting
 * - CORS
 * - Test route (GET /api/v1/test/secure)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createTestUser,
  TestUser,
} from "./helpers";

describe("Middleware & General Integration Tests", () => {
  let testUser: TestUser;

  beforeAll(async () => {
    await cleanupEmulators();
    testUser = await createTestUser({
      email: "middleware@test.com",
      username: "middlewareuser",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/test/secure", () => {
    it("should pass with valid Bearer token", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/test/secure"))
        .set("Authorization", `Bearer ${testUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe("Verification passed!");
    });

    it("should reject requests without auth header", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/test/secure"));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject requests with invalid token", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/test/secure"))
        .set("Authorization", "Bearer invalid-token-here");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("CORS", () => {
    it("should include CORS headers in response", async () => {
      const agent = getTestAgent();
      const res = await agent
        .options(apiPath("/v1/test/secure"))
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "GET");

      // Should have access-control-allow-origin
      expect(res.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("Invalid Routes", () => {
    it("should return 404 for unknown endpoints", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/nonexistent-endpoint"));

      // Express returns 404 for unmatched routes
      expect(res.status).toBe(404);
    });
  });
});
