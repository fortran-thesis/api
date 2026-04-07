/**
 * Integration Tests — Cultivation Details & Culture Session Roundtrip
 *
 * Tests the full flow: create case → create culture session → add cultivation
 * log with culture metadata → retrieve logs and verify culture fields are intact.
 *
 * Requires Firebase emulator (Firestore + Auth).
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {getFirestore} from "firebase-admin/firestore";
import {firebase} from "../../src/configs/firebase";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createCuratorUser,
  createTestUser,
  seedDocument,
  TestUser,
} from "./helpers";

describe("Cultivation Details & Culture Session Integration Tests", () => {
  let mycologist: TestUser;
  let reporter: TestUser;
  let caseId: string;

  beforeAll(async () => {
    await cleanupEmulators();

    [mycologist, reporter] = await Promise.all([
      createCuratorUser(),
      createTestUser({email: `reporter-cult-${Date.now()}@test.com`, username: `reporter_${Date.now()}`}),
    ]);

    // Seed a mold case assigned to the mycologist
    caseId = await seedDocument("mold_cases", {
      user_id: reporter.uid,
      mycologist_id: mycologist.uid,
      name: "Culture Roundtrip Test Case",
      priority: "high",
      is_archived: false,
      start_date: new Date(),
      cultivation_details: {
        growth_medium: "PDA",
        initial_symptoms: ["Leaf spots"],
      },
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  // ── Happy path: culture metadata preserved through log roundtrip ─────────────

  describe("cultivation log with culture fields", () => {
    let logId: string;

    it("should accept a cultivation log with culture_id and culture_name", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath(`/v1/mold-case/${caseId}/logs`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .send({
          type: "vitro",
          image_url: "",
          characteristics: {
            color: "white",
            texture: "cottony",
            culture_id: "culture-sess-001",
            culture_name: "Batch Alpha",
          },
          additional_info: "Log with culture assignment",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      logId = res.body.data?.id;
      expect(logId).toBeDefined();
    });

    it("should return culture_id and culture_name in the retrieved log", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/mold-case/${caseId}/logs`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const logs: Array<{id: string; characteristics: Record<string, unknown>}> =
        res.body.data?.snapshot ?? [];
      const targetLog = logs.find((l) => l.id === logId);

      expect(targetLog).toBeDefined();
      expect(targetLog!.characteristics).toMatchObject({
        culture_id: "culture-sess-001",
        culture_name: "Batch Alpha",
      });
    });
  });

  // ── Edge case: log without culture fields renders cleanly ─────────────────────

  describe("cultivation log without culture fields", () => {
    it("should accept a log that has no culture_id or culture_name", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath(`/v1/mold-case/${caseId}/logs`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .send({
          type: "vivo",
          image_url: "",
          characteristics: {
            macro_color: "olive",
            macro_texture: "powdery",
          },
          additional_info: "Legacy log without culture",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should return the legacy log without culture fields (no runtime errors)", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/mold-case/${caseId}/logs`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);

      const logs: Array<{characteristics: Record<string, unknown>; type: string}> =
        res.body.data?.snapshot ?? [];
      const vivoLog = logs.find((l) => l.type === "vivo");

      expect(vivoLog).toBeDefined();
      expect(vivoLog!.characteristics).not.toHaveProperty("culture_id");
      expect(vivoLog!.characteristics).not.toHaveProperty("culture_name");
    });
  });

  // ── Culture session lifecycle via API ────────────────────────────────────────

  describe("culture session lifecycle", () => {
    let cultureSessionId: string;

    it("should create a culture session for the case", async () => {
      const agent = getTestAgent();
      const targetAt = new Date(Date.now() + 10).toISOString(); // ~immediately available
      const res = await agent
        .post(apiPath(`/v1/mold-case/${caseId}/culture-sessions`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .send({name: "Batch Beta", target_at: targetAt})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      cultureSessionId = res.body.data?.id;
      expect(cultureSessionId).toBeDefined();
    });

    it("should list the created culture session", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/mold-case/${caseId}/culture-sessions`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      const sessions: Array<{id: string}> = res.body.data?.snapshot ?? [];
      expect(sessions.some((s) => s.id === cultureSessionId)).toBe(true);
    });

    it("should end the culture session early", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath(`/v1/mold-case/${caseId}/culture-sessions/${cultureSessionId}/end-early`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.data?.status).toBe("ended_early");
    });

    it("should soft-delete the culture session", async () => {
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/mold-case/${caseId}/culture-sessions/${cultureSessionId}`))
        .set("Authorization", `Bearer ${mycologist.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);

      // Verify it no longer appears in the list
      const db = getFirestore(firebase);
      const snap = await db
        .collection("mold_cases")
        .doc(caseId)
        .collection("culture_sessions")
        .doc(cultureSessionId)
        .get();

      expect(snap.exists).toBe(true);
      const data = snap.data() as Record<string, unknown>;
      expect((data?.metadata as Record<string, unknown>)?.deleted_at).toBeTruthy();
    });
  });
});
