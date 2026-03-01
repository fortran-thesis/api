/**
 * Integration Tests — Mold Report Module
 *
 * Tests mold report endpoints:
 * - POST /api/v1/mold-report          (Authenticated)
 * - GET  /api/v1/mold-report          (Authenticated)
 * - GET  /api/v1/mold-report/:id      (Authenticated)
 * - GET  /api/v1/mold-report/public/resolved-count (Public)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createAdminUser,
  createTestUser,
  seedDocument,
  TestUser,
} from "./helpers";

describe("Mold Report Integration Tests", () => {
  let adminUser: TestUser;
  let regularUser: TestUser;
  let seededReportId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, regularUser] = await Promise.all([
      createAdminUser(),
      createTestUser({email: "moldreportuser@test.com", username: "moldreportuser"}),
    ]);

    // Seed a mold report for read tests
    seededReportId = await seedDocument("mold_reports", {
      title: "Mold on Wall",
      description: "Found mold growth on living room wall",
      location: "Living Room",
      user_id: regularUser.uid,
      status: "pending",
      priority: "medium",
      assignee_id: null,
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/mold-report/public/resolved-count", () => {
    it("should return resolved count (public endpoint)", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/mold-report/public/resolved-count"))
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/mold-report", () => {
    it("should list mold reports for authenticated user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/mold-report"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/mold-report")).query({limit: "10"});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/mold-report/:id", () => {
    it("should return a specific mold report", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/mold-report/${seededReportId}`))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
