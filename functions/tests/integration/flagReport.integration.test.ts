/**
 * Integration Tests — Flag Report Module
 *
 * Tests flag report (content moderation) endpoints:
 * - GET    /api/v1/flag-report           (Curator/Admin)
 * - GET    /api/v1/flag-report/:id       (Curator/Admin)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createAdminUser,
  createCuratorUser,
  createTestUser,
  seedDocument,
  TestUser,
} from "./helpers";

describe("Flag Report Integration Tests", () => {
  let adminUser: TestUser;
  let curatorUser: TestUser;
  let regularUser: TestUser;
  let seededFlagId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, curatorUser, regularUser] = await Promise.all([
      createAdminUser(),
      createCuratorUser(),
      createTestUser({email: "flaguser@test.com", username: "flaguser"}),
    ]);

    // Seed a flag report
    seededFlagId = await seedDocument("flag_reports", {
      content_id: "moldipedia_123",
      content_type: "moldipedia",
      reason: "misleading_description",
      description: "This article contains misleading information",
      reporter_id: regularUser.uid,
      status: "pending",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/flag-report", () => {
    it("should allow curator to list flag reports", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/flag-report"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow admin to list flag reports", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/flag-report"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject regular users", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/flag-report"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/flag-report/:id", () => {
    it("should allow curator to get flag report by ID", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/flag-report/${seededFlagId}`))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
