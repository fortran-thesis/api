/**
 * Integration Tests — System Request Module
 *
 * Tests system request endpoints:
 * - POST  /api/v1/system-request           (Authenticated)
 * - GET   /api/v1/system-request           (Admin)
 * - GET   /api/v1/system-request/:id       (Admin)
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

describe("System Request Integration Tests", () => {
  let adminUser: TestUser;
  let regularUser: TestUser;
  let seededRequestId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, regularUser] = await Promise.all([
      createAdminUser(),
      createTestUser({email: "sysrequser@test.com", username: "sysrequser"}),
    ]);

    // Seed a system request
    seededRequestId = await seedDocument("system_requests", {
      title: "Request curator role",
      description: "I would like to be promoted to curator.",
      type: "role_upgrade",
      user_id: regularUser.uid,
      status: "pending",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/system-request", () => {
    it("should allow admin to list system requests", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/system-request"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/system-request"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/system-request")).query({limit: "10"});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/system-request/:id", () => {
    it("should allow admin to get a system request by ID", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/system-request/${seededRequestId}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
