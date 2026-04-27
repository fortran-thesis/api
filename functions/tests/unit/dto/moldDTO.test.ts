import {describe, it, expect} from "@jest/globals";
import {
  CultivationDetailsSchema,
  CultureSessionCreateSchema,
  CultureSessionIdSchema,
  CultureSessionReassignSchema,
} from "../../../src/dto/moldDTO";

describe("CultivationDetailsSchema (DTO validation)", () => {
  describe("cultivation_details fields", () => {
    it("should accept specimen_type and specimen_quantity", () => {
      const payload = {
        cultivation_details: {
          specimen_type: "Leaf",
          specimen_quantity: 5,
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.specimen_type).toBe("Leaf");
        expect(result.data.cultivation_details?.specimen_quantity).toBe(5);
      }
    });

    it("should accept nested initial_observations", () => {
      const payload = {
        cultivation_details: {
          initial_observations: {
            microscopic_description: "Microscopic description",
            microscopic_color: "Green",
            microscopic_texture: "Velvety",
            microscopic_image_path: "gs://bucket/micro.jpg",
            macroscopic_description: "Macroscopic description",
            macroscopic_color: "White",
            macroscopic_texture: "Powdery",
            macroscopic_symptoms: "Visible lesions",
            macroscopic_characteristics: "Fuzzy growth",
            macroscopic_image_path: "gs://bucket/macro.jpg",
            symptoms: ["Leaf spots", "Wilting"],
            signs: ["Powdery residue"],
            characteristics: ["Cottony", "Powdery"],
            ai_snapshot: {
              identified_mold: "Aspergillus niger",
              mold_id: "mold-1",
              confidence: 98,
              confidence_display: "98%",
              model_source: "lookup_refresh",
              captured_at: new Date().toISOString(),
              used_ann: true,
              used_fusion: false,
              top_predictions: [
                {moldId: "mold-1", moldName: "Aspergillus niger", confidence: 98},
              ],
            },
          },
        },
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cultivation_details?.initial_observations?.symptoms).toEqual([
          "Leaf spots",
          "Wilting",
        ]);
        expect(result.data.cultivation_details?.initial_observations?.ai_snapshot?.identified_mold).toBe(
          "Aspergillus niger"
        );
      }
    });

    it("should accept location_gathered as optional string", () => {
      const payload = {
        cultivation_details: {
          specimen_type: "Leaf",
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
          specimen_type: "Stem",
          specimen_quantity: 3,
          location_gathered: "Northwest field",
          scanned_microscopic_ids: ["scan-micro-1"],
          scanned_macroscopic_ids: ["scan-macro-1"],
          initial_observations: {
            microscopic_description: "Microscopic note",
            microscopic_color: "Green",
            microscopic_texture: "Velvety",
            macroscopic_description: "Macroscopic note",
            macroscopic_color: "White",
            macroscopic_texture: "Powdery",
            macroscopic_symptoms: "Visible lesions",
            macroscopic_characteristics: "Fuzzy growth",
            symptoms: ["Leaf spots", "Yellowing"],
            signs: ["Powdery residue"],
            characteristics: ["Cottony", "Fuzzy"],
          },
        },
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = CultivationDetailsSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const cultDetails = result.data.cultivation_details!;
        expect(cultDetails.specimen_type).toBe("Stem");
        expect(cultDetails.specimen_quantity).toBe(3);
        expect(cultDetails.scanned_microscopic_ids).toEqual(["scan-micro-1"]);
        expect(cultDetails.scanned_macroscopic_ids).toEqual(["scan-macro-1"]);
        expect(cultDetails.initial_observations?.symptoms).toHaveLength(2);
        expect(cultDetails.initial_observations?.signs).toHaveLength(1);
        expect(cultDetails.initial_observations?.characteristics).toHaveLength(2);
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
