/**
 * Integration Tests — User Module
 *
 * Tests user management endpoints against Firebase emulators:
 * - GET    /api/v1/user           (Admin)
 * - GET    /api/v1/user/profile   (Authenticated)
 * - GET    /api/v1/user/:id       (Authenticated)
 * - PATCH  /api/v1/user/profile   (Authenticated)
 * - GET    /api/v1/user/mycologists (Admin)
 * - GET    /api/v1/user/counts/roles (Admin)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createAdminUser,
  createCuratorUser,
  createTestUser,
  TestUser,
} from "./helpers";

describe("User Integration Tests", () => {
  let adminUser: TestUser;
  let curatorUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, curatorUser, regularUser] = await Promise.all([
      createAdminUser(),
      createCuratorUser(),
      createTestUser({
        email: "regular@test.com",
        username: "regularuser",
        firstName: "Regular",
        lastName: "User",
      }),
    ]);
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/user (Admin list all users)", () => {
    it("should allow admin to list all users", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin trying to list users", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/user")).query({limit: "10"});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/user/profile", () => {
    it("should return the authenticated user's profile", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user/profile"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated profile requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/user/profile"));

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/user/:id", () => {
    it("should return a user by ID when authenticated", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/user/${regularUser.uid}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated user lookups", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath(`/v1/user/${regularUser.uid}`));

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/user/profile", () => {
    it("should allow user to update their own profile", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath("/v1/user/profile"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({
          first_name: "Updated",
          last_name: "Name",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated profile updates", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath("/v1/user/profile"))
        .send({first_name: "Hacked"});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/user/mycologists", () => {
    it("should allow admin to list mycologists", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user/mycologists"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-admin", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user/mycologists"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/user/counts/roles", () => {
    it("should allow admin to get role counts", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/user/counts/roles"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
