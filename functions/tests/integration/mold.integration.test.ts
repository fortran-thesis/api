/**
 * Integration Tests — Mold Catalogue Module
 *
 * Tests mold catalogue endpoints:
 * - GET /api/v1/mold         (Curator/Admin)
 * - GET /api/v1/mold/:id     (Curator/Admin)
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

describe("Mold Catalogue Integration Tests", () => {
  let adminUser: TestUser;
  let curatorUser: TestUser;
  let regularUser: TestUser;
  let seededMoldId: string;

  beforeAll(async () => {
    await cleanupEmulators();
    [adminUser, curatorUser, regularUser] = await Promise.all([
      createAdminUser(),
      createCuratorUser(),
      createTestUser({email: "molduser@test.com", username: "molduser"}),
    ]);

    // Seed a mold entry
    seededMoldId = await seedDocument("molds", {
      name: "Aspergillus niger",
      scientific_name: "Aspergillus niger",
      description: "Common black mold found on food",
      risk_level: "moderate",
      kingdom: "Fungi",
      phylum: "Ascomycota",
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("GET /api/v1/mold", () => {
    it("should allow curator to list molds", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/mold"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow admin to list molds", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/mold"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject regular user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/mold"))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({limit: "10"});

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/mold/:id", () => {
    it("should allow curator to get mold by ID", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/mold/${seededMoldId}`))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
