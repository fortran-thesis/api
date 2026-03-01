/**
 * Integration Tests — Admin Module
 *
 * Tests admin-only management endpoints:
 * - POST /api/v1/admin/disable-user  (Admin only)
 * - POST /api/v1/admin/enable-user   (Admin only)
 * - POST /api/v1/admin/ban-user      (Admin only)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createAdminUser,
  createTestUser,
  TestUser,
} from "./helpers";

describe("Admin Integration Tests", () => {
  let adminUser: TestUser;
  let targetUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, targetUser, regularUser] = await Promise.all([
      createAdminUser(),
      createTestUser({email: "target@test.com", username: "targetuser"}),
      createTestUser({email: "nonadmin@test.com", username: "nonadminuser"}),
    ]);
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("POST /api/v1/admin/disable-user", () => {
    it("should allow admin to disable a user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/disable-user"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send({id: targetUser.uid})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin attempting to disable a user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/disable-user"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({id: targetUser.uid});

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/disable-user"))
        .send({id: targetUser.uid});

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/admin/enable-user", () => {
    it("should allow admin to enable a user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/enable-user"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send({id: targetUser.uid})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/enable-user"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({id: targetUser.uid});

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/admin/ban-user", () => {
    it("should allow admin to ban a user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/ban-user"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send({id: targetUser.uid})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/admin/ban-user"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({id: targetUser.uid});

      expect(res.status).toBe(403);
    });
  });
});
