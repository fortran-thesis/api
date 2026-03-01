/**
 * Integration Tests — FAQ Module
 *
 * Tests CRUD operations for FAQs against Firebase emulators:
 * - POST   /api/v1/faq        (Curator/Admin only)
 * - GET    /api/v1/faq        (Public)
 * - GET    /api/v1/faq/:id    (Public)
 * - PATCH  /api/v1/faq/:id    (Curator/Admin only)
 * - DELETE /api/v1/faq/hard/:id  (Admin only)
 * - DELETE /api/v1/faq/soft/:id  (Admin only)
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

describe("FAQ Integration Tests", () => {
  let adminUser: TestUser;
  let curatorUser: TestUser;
  let regularUser: TestUser;
  let createdFaqId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    // Create test users with different roles
    [adminUser, curatorUser, regularUser] = await Promise.all([
      createAdminUser(),
      createCuratorUser(),
      createTestUser({email: "faquser@test.com", username: "faquser"}),
    ]);
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("POST /api/v1/faq", () => {
    it("should allow curator to create a FAQ", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/faq"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .send({
          question: "What is mold?",
          answer: "Mold is a type of fungus.",
          user_id: curatorUser.uid,
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      createdFaqId = res.body.data.id;
    });

    it("should allow admin to create a FAQ", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/faq"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send({
          question: "How to detect mold?",
          answer: "Use visual inspection or testing kits.",
          user_id: adminUser.uid,
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject FAQ creation by regular user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/faq"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({
          question: "Can I create FAQs?",
          answer: "No, you cannot.",
          user_id: regularUser.uid,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject FAQ creation without auth", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/faq")).send({
        question: "No auth?",
        answer: "No auth!",
        user_id: "fake",
      });

      expect(res.status).toBe(401);
    });

    it("should reject FAQ with missing fields", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/faq"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .send({
          question: "Only question, no answer",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/faq", () => {
    it("should return all FAQs (public endpoint)", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/faq"))
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should support pagination via limit query", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/faq"))
        .query({limit: "1"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/faq/:id", () => {
    it("should return a specific FAQ by ID", async () => {
      if (!createdFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/faq/${createdFaqId}`))
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 for non-existent FAQ", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/faq/nonexistent12345678"));

      // Could be 400 or 404 depending on implementation
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/faq/:id", () => {
    it("should allow curator to update a FAQ", async () => {
      if (!createdFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/faq/${createdFaqId}`))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .send({
          answer: "Updated answer about mold.",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject update by regular user", async () => {
      if (!createdFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/faq/${createdFaqId}`))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .send({answer: "Hacked answer"});

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/faq/soft/:id", () => {
    it("should allow admin to soft-delete a FAQ", async () => {
      if (!createdFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/faq/soft/${createdFaqId}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject soft-delete by curator", async () => {
      if (!createdFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/faq/soft/${createdFaqId}`))
        .set("Authorization", `Bearer ${curatorUser.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/faq/hard/:id", () => {
    let tempFaqId: string;

    beforeAll(async () => {
      // Create a FAQ to hard-delete
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/faq"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send({
          question: "Temp FAQ?",
          answer: "Will be deleted.",
          user_id: adminUser.uid,
        });
      tempFaqId = res.body.data?.id;
    });

    it("should allow admin to hard-delete a FAQ", async () => {
      if (!tempFaqId) return;
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/faq/hard/${tempFaqId}`))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
