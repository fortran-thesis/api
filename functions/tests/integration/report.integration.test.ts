/**
 * Integration Tests — Report (User-to-User) Module
 *
 * Tests user misconduct report endpoints:
 * - GET   /api/v1/report           (Admin)
 * - GET   /api/v1/report/:id       (Admin)
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

describe("Report Integration Tests", () => {
  let adminUser: TestUser;
  let regularUser: TestUser;
  let seededReportId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, regularUser] = await Promise.all([
      createAdminUser(),
      createTestUser({email: "reportuser@test.com", username: "reportuser"}),
    ]);

    // Seed a user-to-user report
    seededReportId = await seedDocument("reports", {
      reporter_id: regularUser.uid,
      reported_user_id: "some-user-id",
      reason: "offensive_language",
      description: "User was using offensive language",
      status: "pending",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/report", () => {
    it("should allow admin to list reports", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/report"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/report"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/report")).query({limit: "10"});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/report/:id", () => {
    it("should allow admin to get report by ID", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/report/${seededReportId}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
