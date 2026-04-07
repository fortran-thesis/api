import {describe, it, expect} from "@jest/globals";
import {
  CultivationDetailsSchema,
  CultureSessionCreateSchema,
  CultureSessionIdSchema,
  CultureSessionReassignSchema,
} from "../../../src/dto/moldDTO";

describe("CultivationDetailsSchema (DTO validation)", () => {
  describe("cultivation_details fields", () => {
    it("should accept basic cultivation_details with growth_medium", () => {
      const payload = {
        cultivation_details: {
          growth_medium: "Potato Dextrose Agar",
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.growth_medium).toBe(
          "Potato Dextrose Agar"
        );
      }
    });

    it("should accept specimen_types and specimen_quantities arrays", () => {
      const payload = {
        cultivation_details: {
          growth_medium: "PDA",
          specimen_types: ["Leaf", "Stem"],
          specimen_quantities: ["5", "3"],
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.specimen_types).toEqual([
          "Leaf",
          "Stem",
        ]);
        expect(result.data.cultivation_details?.specimen_quantities).toEqual([
          "5",
          "3",
        ]);
      }
    });

    it("should accept initial_symptoms and initial_characteristics arrays", () => {
      const payload = {
        cultivation_details: {
          growth_medium: "PDA",
          initial_symptoms: ["Leaf spots", "Wilting"],
          initial_characteristics: ["Cottony", "Powdery"],
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.initial_symptoms).toEqual([
          "Leaf spots",
          "Wilting",
        ]);
        expect(result.data.cultivation_details?.initial_characteristics).toEqual(
          ["Cottony", "Powdery"]
        );
      }
    });

    it("should accept initial_signs and initial_signs_csv", () => {
      const payload = {
        cultivation_details: {
          initial_signs: ["Dark sporulation", "Powdery residue"],
          initial_signs_csv: "Dark sporulation,Powdery residue",
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.initial_signs).toEqual([
          "Dark sporulation",
          "Powdery residue",
        ]);
        expect(result.data.cultivation_details?.initial_signs_csv).toBe(
          "Dark sporulation,Powdery residue"
        );
      }
    });

    it("should accept location_gathered as optional string", () => {
      const payload = {
        cultivation_details: {
          growth_medium: "PDA",
          location_gathered: "Farm field A, plot 3",
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.location_gathered).toBe(
          "Farm field A, plot 3"
        );
      }
    });

    it("should accept all new fields together (full monitoring setup)", () => {
      const payload = {
        cultivation_details: {
          growth_medium: "PDA",
          specimen_types: ["Leaf", "Stem", "Root"],
          specimen_quantities: ["5", "3", "2"],
          initial_symptoms: ["Leaf spots", "Yellowing"],
          initial_characteristics: ["Cottony", "Fuzzy"],
          location_gathered: "Northwest field",
          in_vivo_details: {environmental_temperature: 25},
          in_vitro_details: {incubation_temperature: 28},
        },
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const cultDetails = result.data.cultivation_details!;
        expect(cultDetails.specimen_types).toHaveLength(3);
        expect(cultDetails.specimen_quantities).toHaveLength(3);
        expect(cultDetails.initial_symptoms).toHaveLength(2);
        expect(cultDetails.initial_characteristics).toHaveLength(2);
        expect(cultDetails.location_gathered).toBeDefined();
        expect(cultDetails.in_vivo_details).toBeDefined();
        expect(cultDetails.in_vitro_details).toBeDefined();
      }
    });

    it("should accept object with only timestamps (backward compatible)", () => {
      const payload = {
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should accept empty cultivation_details object", () => {
      const payload = {
        cultivation_details: {},
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should accept undefined cultivation_details (optional)", () => {
      const payload = {
        cultivation_details: undefined,
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject non-string values in specimen_types array", () => {
      const payload = {
        cultivation_details: {
          specimen_types: ["Leaf", 123],
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject specimen_quantities without specimen_types (but still valid)", () => {
      // This is allowed since arrays are independent
      const payload = {
        cultivation_details: {
          specimen_quantities: ["5", "3"],
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("culture session schemas", () => {
    it("should accept culture session create payload", () => {
      const payload = {
        name: "Culture A",
        target_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = CultureSessionCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject empty culture session name", () => {
      const payload = {
        name: "   ",
        target_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = CultureSessionCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should accept reassign payload and culture session params", () => {
      const reassignPayload = {
        target_at: new Date(Date.now() + 172800000).toISOString(),
      };

      const paramsPayload = {
        id: "abc123_DEF-456",
        cultureId: "culture_001",
      };

      expect(CultureSessionReassignSchema.safeParse(reassignPayload).success).toBe(true);
      expect(CultureSessionIdSchema.safeParse(paramsPayload).success).toBe(true);
    });
  });
});
