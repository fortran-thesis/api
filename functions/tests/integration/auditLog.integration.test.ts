/**
 * Integration Tests — Audit Log Module
 *
 * Tests audit log endpoints:
 * - GET /api/v1/audit-log           (Admin)
 * - GET /api/v1/audit-log/:action   (Authenticated)
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

describe("Audit Log Integration Tests", () => {
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, regularUser] = await Promise.all([
      createAdminUser(),
      createTestUser({email: "audituser@test.com", username: "audituser"}),
    ]);

    // Seed some audit log entries
    await seedDocument("audit_logs", {
      action: "profile_update",
      user_id: regularUser.uid,
      target_id: regularUser.uid,
      description: "Updated own profile",
    });

    await seedDocument("audit_logs", {
      action: "add_mold",
      user_id: adminUser.uid,
      target_id: "mold_123",
      description: "Added new mold entry",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/audit-log", () => {
    it("should allow admin to get all audit logs", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/audit-log"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/audit-log"));

      expect(res.status).toBe(401);
    });

    it("should reject non-admin users", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/audit-log"))
        .set("Authorization", `Bearer ${regularUser.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/audit-log/:action", () => {
    it("should return logs filtered by action for authenticated user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/audit-log/profile_update"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
