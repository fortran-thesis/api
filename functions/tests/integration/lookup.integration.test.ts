import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createTestUser,
  seedDocument,
  TestUser,
} from "./helpers";

describe("Lookup Integration Tests", () => {
  let user: TestUser;
  beforeAll(async () => {
    await cleanupEmulators();
    user = await createTestUser({email: "lookup-user@test.com", username: "lookupuser"});

    // Seed two molds
    await seedDocument("molds", {
      name: "Aspergillus Flavus",
      symptoms: ["yellowing", "wilting"],
      signs: ["white coating"],
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

  it("returns ranked lookup results", async () => {
    const agent = getTestAgent();

    const res = await agent
      .post(apiPath("/v1/lookup"))
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        symptoms: ["yellowing", "wilting"],
        signs: ["white coating"],
        characteristics: ["aflatoxin production"],
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Top result should be Aspergillus Flavus
    expect(res.body.data[0].moldName).toBe("Aspergillus Flavus");
    expect(res.body.data[0].confidence).toBeGreaterThan(0);
  });
});
