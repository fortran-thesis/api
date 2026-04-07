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
  getDocument,
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

  describe("POST /api/v1/mold", () => {
    it("should persist nested details fields on create", async () => {
      const payload = {
        moldName: "Integration Created Mold",
        details: {
          info: {
            description: "Integration description",
            overview: "Integration overview",
          },
          prevention: {
            physicalControl: "Dry surfaces",
            chemicalControl: "Apply treatment",
          },
        },
      };

      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/mold"))
        .set("Authorization", `Bearer ${adminUser.token}`)
        .send(payload)
        .expect("Content-Type", /json/);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.name).toBe(payload.moldName);
      expect(res.body.data?.mold_details?.info?.description).toBe(
        payload.details.info.description
      );
      expect(res.body.data?.mold_details?.prevention?.physicalControl).toBe(
        payload.details.prevention.physicalControl
      );

      const createdId = res.body.data?.id;
      expect(typeof createdId).toBe("string");
      expect(createdId.length).toBeGreaterThan(0);

      const storedDoc = await getDocument("molds", createdId);
      expect(storedDoc.exists).toBe(true);
      const storedData = storedDoc.data() as any;
      expect(storedData?.mold_details?.info?.description).toBe(
        payload.details.info.description
      );
      expect(storedData?.mold_details?.prevention?.physicalControl).toBe(
        payload.details.prevention.physicalControl
      );
    });
  });
});
