/**
 * Integration Tests — Moldipedia Module
 *
 * Tests CRUD operations for the Moldipedia (wiki) endpoints:
 * - POST   /api/v1/moldipedia       (Curator/Admin)
 * - GET    /api/v1/moldipedia       (Public)
 * - GET    /api/v1/moldipedia/:id   (Public)
 * - PATCH  /api/v1/moldipedia/:id   (Curator/Admin)
 * - PATCH  /api/v1/moldipedia/:id/archive   (Curator/Admin)
 * - DELETE /api/v1/moldipedia/hard/:id (Admin)
 * - DELETE /api/v1/moldipedia/soft/:id (Admin)
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

describe("Moldipedia Integration Tests", () => {
  let adminUser: TestUser;
  let curatorUser: TestUser;
  let regularUser: TestUser;
  let seededArticleId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, curatorUser, regularUser] = await Promise.all([
      createAdminUser(),
      createCuratorUser(),
      createTestUser({email: "moldipediauser@test.com", username: "moldipediauser"}),
    ]);

    // Seed a moldipedia article directly in Firestore for read tests
    seededArticleId = await seedDocument("moldipedia", {
      title: "Black Mold",
      scientific_name: "Stachybotrys chartarum",
      description: "A common indoor mold species.",
      details: {
        habitat: "Damp indoor surfaces",
        risk_level: "High",
      },
      user_id: curatorUser.uid,
      is_archived: false,
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/moldipedia", () => {
    it("should return all moldipedia articles (public)", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/moldipedia"))
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should support search query", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/moldipedia"))
        .query({search: "Black Mold"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/moldipedia", () => {
    it("should store uploaded cover photo as firebase private URL", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/moldipedia"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .field("details", JSON.stringify({
          title: "Storage URL article",
          body: "Ensures upload stores private URL",
        }))
        .attach("cover_photo", Buffer.from("fake-image-bytes"), "cover.jpg")
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cover_photo).toMatch(/^gs:\/\//);
      expect(res.body.data.cover_photo).toContain("moldipedia/");
    });
  });

  describe("GET /api/v1/moldipedia/:id", () => {
    it("should return a specific moldipedia article", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/moldipedia/${seededArticleId}`))
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should handle non-existent article", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/moldipedia/nonexistent1234567"));

      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/moldipedia/:id", () => {
    it("should allow curator to update a moldipedia article", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/moldipedia/${seededArticleId}`))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .send({
          description: "Updated description of black mold.",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject update by regular user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/moldipedia/${seededArticleId}`))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({description: "Hacked"});

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/moldipedia/:id/archive", () => {
    it("should allow curator to archive an article", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/moldipedia/${seededArticleId}/archive`))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/moldipedia/archive", () => {
    it("should allow curator to list archived articles", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/moldipedia/archive"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated users", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/moldipedia/archive"));

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/moldipedia", () => {
    let tempArticleId: string;

    beforeAll(async () => {
      tempArticleId = await seedDocument("moldipedia", {
        title: "Temp Article",
        description: "To be deleted",
        user_id: adminUser.uid,
        is_archived: false,
      });
    });

    it("should allow admin to soft-delete a moldipedia article", async () => {
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/moldipedia/soft/${tempArticleId}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject delete by regular user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/moldipedia/soft/${tempArticleId}`))
        .set("Authorization", `Bearer ${regularUser.token}`);

      expect(res.status).toBe(403);
    });
  });
});
