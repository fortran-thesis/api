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
import {getFirestore} from "firebase-admin/firestore";
import {firebase} from "../../src/configs/firebase";
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
          author_id: curatorUser.uid,
        }))
        .attach("cover_photo", Buffer.from("fake-image-bytes"), "cover.jpg")
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cover_photo).toMatch(/^gs:\/\//);
      expect(res.body.data.cover_photo).toContain("moldipedia/");
    });

    it("should create and return full moldipedia schema with findings and analysis fields", async () => {
      const agent = getTestAgent();
      const detailsPayload = {
        title: "Schema Sync Article",
        body: "Detailed body content",
        author_id: curatorUser.uid,
        mold_type: "Aspergillus",
        affected_hosts: "Wheat, Maize",
        symptoms: "Spotting, wilting",
        disease_cycle: "Sporulation in humid conditions",
        impact: "Yield reduction up to 35%",
        prevention: "Improve ventilation and apply fungicides",
        treatments: {
          mechanical: "Remove affected tissue",
          cultural: "Rotate crops",
          biological: "Introduce antagonists",
          physical: "Control humidity",
          chemical: "Apply approved fungicide",
        },
        findings: [
          { title: "Lab test", content: "Positive on PCR" },
          { title: "Field test", content: "Visible symptoms" },
        ],
      };

      const res = await agent
        .post(apiPath("/v1/moldipedia"))
        .set("Authorization", `Bearer ${curatorUser.token}`)
        .field("details", JSON.stringify(detailsPayload))
        .attach("cover_photo", Buffer.from("fake-image-bytes"), "cover2.jpg")
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const record = res.body.data;
      expect(record).toMatchObject({
        title: "Schema Sync Article",
        mold_type: "Aspergillus",
        affected_hosts: "Wheat, Maize",
        symptoms: "Spotting, wilting",
        disease_cycle: "Sporulation in humid conditions",
        impact: "Yield reduction up to 35%",
        prevention: "Improve ventilation and apply fungicides",
      });
      expect(record.findings).toHaveLength(2);
      expect(record.findings[0]).toEqual({ title: "Lab test", content: "Positive on PCR" });

      // verify GET by ID returns the same shape
      const getRes = await agent
        .get(apiPath(`/v1/moldipedia/${record.id}`))
        .expect("Content-Type", /json/);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data).toMatchObject({
        title: "Schema Sync Article",
        mold_type: "Aspergillus",
        affected_hosts: "Wheat, Maize",
        symptoms: "Spotting, wilting",
        disease_cycle: "Sporulation in humid conditions",
        impact: "Yield reduction up to 35%",
        prevention: "Improve ventilation and apply fungicides",
      });
      expect(getRes.body.data.findings).toHaveLength(2);
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

  describe("GET /api/v1/moldipedia/:id/cases", () => {
    let linkedCaseId: string;

    beforeAll(async () => {
      linkedCaseId = await seedDocument("mold_cases", {
        user_id: regularUser.uid,
        mycologist_id: curatorUser.uid,
        name: "Linked Evidence Case",
        mold_report_id: "report-linked-evidence",
        priority: "medium",
        start_date: new Date(),
        end_date: new Date(),
        is_archived: true,
        cultivation_details: {
          growth_medium: "PDA",
          initial_symptoms: ["Leaf spots"],
          initial_characteristics: ["Powdery surface"],
          initial_microscopic: "Septate hyphae observed",
          initial_macroscopic: "Dark olive colonies",
        },
        final_verdict: {
          moldId: "mold-123",
          moldName: "Alternaria",
          confidence: 82,
          moldipedia_id: seededArticleId,
          mycologist_notes: "Matched by morphology and growth pattern",
          verdict_timestamp: new Date(),
        },
      });

      const db = getFirestore(firebase);
      await db
        .collection("mold_cases")
        .doc(linkedCaseId)
        .collection("cultivation_logs")
        .add({
          type: "vivo",
          image_url: "",
          characteristics: {
            lesion_color: "brown",
            lesion_size: 2,
            symptoms: ["Necrotic margins"],
          },
          additional_info: "Progressive lesion growth",
          metadata: {
            created_at: new Date(),
            updated_at: null,
            deleted_at: null,
          },
        });
    });

    it("should include evidence_summary and cultivation logs when includeEvidence=true", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/moldipedia/${seededArticleId}/cases`))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .query({includeEvidence: "true"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const matched = res.body.data.find((entry: any) => entry.id === linkedCaseId);
      expect(matched).toBeDefined();
      expect(matched.evidence_summary).toBeDefined();
      expect(matched.evidence_summary.threshold.value).toBe(70);
      expect(matched.evidence_summary.initial.microscopic).toBe("Septate hyphae observed");
      expect(Array.isArray(matched.cultivation_logs)).toBe(true);
      expect(matched.cultivation_logs.length).toBeGreaterThan(0);
    });

    it("should keep backward-compatible shape without evidence_summary by default", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/moldipedia/${seededArticleId}/cases`))
        .set("Authorization", `Bearer ${regularUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const matched = res.body.data.find((entry: any) => entry.id === linkedCaseId);
      expect(matched).toBeDefined();
      expect(matched.evidence_summary).toBeUndefined();
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
