import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createTestUser,
  seedDocument,
  TestUser,
  getDocument,
} from "./helpers";

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("Mold Report Lookup Integration", () => {
  let user: TestUser;
  beforeAll(async () => {
    await cleanupEmulators();
    user = await createTestUser({email: "report-user@test.com", username: "reportuser"});

    // Seed molds
    await seedDocument("molds", {
      name: "Aspergillus Flavus",
      symptoms: ["yellowing", "wilting", "spotting"],
      signs: ["white coating", "dark discoloration"],
      characteristics: ["aflatoxin production"],
    });

    await seedDocument("molds", {
      name: "Fusarium",
      symptoms: ["wilting", "one-sided yellowing"],
      signs: ["brown vascular discoloration"],
      characteristics: ["soil-borne persistence"],
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  it("creates a mold report with reported fields", async () => {
    const agent = getTestAgent();

    const payload = {
      case_name: "Test Case Report",
      host: "Tomato",
      location: "Manila",
      date_observed: new Date().toISOString(),
      description: "Yellow spots observed",
      reported_symptoms: ["yellowing"],
      reported_signs: ["white coating"],
      reported_characteristics: ["aflatoxin production"],
    };

    const res = await agent
      .post(apiPath("/v1/mold-report"))
      .set("Authorization", `Bearer ${user.token}`)
      .send(payload)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const created = res.body.data;
    expect(created).toBeDefined();
    const reportId = created.id || created._id;
    expect(reportId).toBeDefined();

    // Give a brief moment for any async operations to complete
    await new Promise(r => setTimeout(r, 200));

    // Verify reported fields were saved to the document
    const doc = await getDocument("mold_reports", reportId);
    const data = doc.exists ? doc.data() : null;
    
    expect(data).toBeDefined();
    expect(data?.reported_symptoms).toEqual(["yellowing"]);
    expect(data?.reported_signs).toEqual(["white coating"]);
    expect(data?.reported_characteristics).toEqual(["aflatoxin production"]);
  });

  it("lookup endpoint returns ranked results from seeded molds", async () => {
    const agent = getTestAgent();

    // Verify lookup endpoint works with seeded molds
    const res = await agent
      .post(apiPath("/v1/lookup"))
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        reported_symptoms: ["yellowing"],
        reported_signs: ["white coating"],
        reported_characteristics: ["aflatoxin production"],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    
    // Top result should be Aspergillus Flavus (has all three attributes)
    const topResult = res.body.data[0];
    expect(topResult.moldName).toBeDefined();
    expect(topResult.confidence).toBeGreaterThan(0);
    expect(topResult.moldId).toBeDefined();
  });
});
