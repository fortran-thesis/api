import {describe, expect, it} from "@jest/globals";
import {
  enrichMoldInfo,
  normalizeMoldCompatibility,
} from "../../../src/controllers/moldController";

describe("moldController compatibility enrichment", () => {
  it("upserts canonical additional_info rows from scalar fields", () => {
    const enriched = enrichMoldInfo({
      overview: "Canonical overview",
      health_risks: "Updated health risk",
      additional_info: [
        {title: "overview", description: "old overview"},
        {title: "Health Risks", description: "old health risk"},
      ],
    } as any);

    const rows = enriched.additional_info || [];
    const overviewRows = rows.filter((row) => row.title === "Overview");
    const riskRows = rows.filter((row) => row.title === "Health Risks");

    expect(overviewRows).toHaveLength(1);
    expect(overviewRows[0].description).toBe("Canonical overview");
    expect(riskRows).toHaveLength(1);
    expect(riskRows[0].description).toBe("Updated health risk");
  });

  it("backfills scalar fields from legacy additional_info aliases", () => {
    const enriched = enrichMoldInfo({
      additional_info: [
        {title: "Symptoms & Signs", description: "Leaf spots and lesion growth"},
        {title: "Disease Cycle Spread", description: "Airborne spread during humid periods"},
      ],
    } as any);

    expect(enriched.symptoms_and_signs).toBe("Leaf spots and lesion growth");
    expect(enriched.disease_cycle_spread_impact).toBe(
      "Airborne spread during humid periods"
    );
  });

  it("normalizes read payloads so scalar fields emit canonical rows", () => {
    const mold = normalizeMoldCompatibility({
      id: "mold-1",
      name: "Aspergillus",
      mold_details: {
        info: {
          overview: "A canonical summary",
          prevention_summary: "Keep surfaces dry",
        },
      },
    } as any);

    const rows = mold.mold_details?.info?.additional_info || [];
    expect(rows).toEqual(
      expect.arrayContaining([
        {title: "Overview", description: "A canonical summary"},
        {title: "Prevention Summary", description: "Keep surfaces dry"},
      ])
    );
  });

  it("normalizes read payloads so legacy rows hydrate scalar fields", () => {
    const mold = normalizeMoldCompatibility({
      id: "mold-2",
      name: "Aspergillus",
      mold_details: {
        info: {
          additional_info: [
            {title: "Affected Crops", description: "Onion, garlic, and bulb crops"},
          ],
        },
      },
    } as any);

    expect(mold.mold_details?.info?.affected_hosts).toBe(
      "Onion, garlic, and bulb crops"
    );
    expect(mold.mold_details?.info?.additional_info).toEqual(
      expect.arrayContaining([
        {title: "Affected Hosts", description: "Onion, garlic, and bulb crops"},
      ])
    );
  });
});
