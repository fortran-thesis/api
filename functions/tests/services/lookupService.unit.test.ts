import {describe, it, expect, jest, beforeEach, afterEach} from "@jest/globals";
import {performMoldLookup, LookupResult} from "../../src/services/lookupService";
import {getFirestore} from "firebase-admin/firestore";

// Mock Firebase Firestore
jest.mock("firebase-admin/firestore");
jest.mock("../../src/utils/dev");

const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;

describe("lookupService.performMoldLookup (unit)", () => {
  let mockDb: any;
  let mockCollection: any;
  let mockSnapshot: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Firestore structure
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockGetFirestore.mockReturnValue(mockDb as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should return empty array when no molds exist in database", async () => {
      // Setup: no molds in database
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      });

      const result = await performMoldLookup(["yellowing"], ["spotting"], ["rapid spread"]);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it("should return empty array when no reported items provided", async () => {
      // Setup: molds exist but no input
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Aspergillus Flavus",
                symptoms: ["yellowing"],
                signs: ["spotting"],
                characteristics: ["rapid spread"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup([], [], []);

      expect(result).toEqual([]);
    });
  });

  describe("Confidence Calculation", () => {
    it("should calculate 100% confidence for all matching reported items", async () => {
      // Setup: mold with 3 matching symptoms
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold A",
                symptoms: ["yellow", "wilting", "spotting"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellow", "wilting", "spotting"], [], []);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
      expect(result[0]?.moldName).toBe("Mold A");
    });

    it("should calculate 50% confidence for partial matches", async () => {
      // Setup: reported 4 items, mold has 2 of them
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold B",
                symptoms: ["yellowing", "wilting"],
                signs: ["spotting"],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(
        ["yellowing", "wilting"],
        ["spotting", "no-match"],
        []
      );

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(75); // 3 matches / 4 reported = 75%
    });

    it("should calculate 0% confidence for no matches and filter them out", async () => {
      // Setup: mold with no matching items
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold C",
                symptoms: ["abc", "def"],
                signs: ["ghi"],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["xyz", "123"], ["456"], []);

      expect(result).toEqual([]);
    });
  });

  describe("Case Insensitivity", () => {
    it("should perform case-insensitive matching on symptoms", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold D",
                symptoms: ["Yellowing", "WILTING"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing", "wilting"], [], []);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });

    it("should perform case-insensitive matching on signs", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold E",
                symptoms: [],
                signs: ["White Coating", "DARK SPOTS"],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup([], ["white coating", "dark spots"], []);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });

    it("should perform case-insensitive matching on characteristics", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold F",
                symptoms: [],
                signs: [],
                characteristics: ["Rapid Spread", "HIGH MOISTURE"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup([], [], ["rapid spread", "high moisture"]);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });

    it("should handle mixed case reported items", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold G",
                symptoms: ["yellowing"],
                signs: ["white coating"],
                characteristics: ["rapid spread"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(
        ["YELLOWING"],
        ["White Coating"],
        ["RAPID SPREAD"]
      );

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });
  });

  describe("Multi-Category Matching", () => {
    it("should match across all three categories (symptoms, signs, characteristics)", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold H",
                symptoms: ["yellowing", "wilting"],
                signs: ["spotting", "coating"],
                characteristics: ["rapid spread", "moisture dependent"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(
        ["yellowing", "wilting"],
        ["spotting", "coating"],
        ["rapid spread", "moisture dependent"]
      );

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
      expect(result[0]?.moldName).toBe("Mold H");
    });

    it("should handle partial input (only symptoms, no signs or characteristics)", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold I",
                symptoms: ["yellowing"],
                signs: ["spotting"],
                characteristics: ["rapid spread"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });

    it("should handle partial input (symptoms + characteristics, no signs)", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold J",
                symptoms: ["yellowing"],
                signs: ["spotting"],
                characteristics: ["rapid spread"],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], ["rapid spread"]);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(100);
    });
  });

  describe("Ranking and Top 10 Limit", () => {
    it("should sort results by confidence in descending order", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold K (High Confidence)",
                symptoms: ["yellowing", "wilting"],
                signs: [],
                characteristics: [],
              }),
            },
            {
              id: "mold_2",
              data: () => ({
                name: "Mold L (Medium Confidence)",
                symptoms: ["yellowing"],
                signs: [],
                characteristics: [],
              }),
            },
            {
              id: "mold_3",
              data: () => ({
                name: "Mold M (Low Confidence)",
                symptoms: ["wilting"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing", "wilting"], [], []);

      expect(result.length).toBe(3);
      expect(result[0]?.moldName).toBe("Mold K (High Confidence)");
      expect(result[0]?.confidence).toBe(100);
      expect(result[1]?.moldName).toBe("Mold L (Medium Confidence)");
      expect(result[1]?.confidence).toBe(50);
      expect(result[2]?.moldName).toBe("Mold M (Low Confidence)");
      expect(result[2]?.confidence).toBe(50);
    });

    it("should limit results to top 10", async () => {
      const moldsArray = Array.from({length: 15}, (_, i) => ({
        id: `mold_${i}`,
        data: () => ({
          name: `Mold ${i}`,
          symptoms: ["yellowing"],
          signs: [],
          characteristics: [],
        }),
      }));

      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: moldsArray,
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(result.length).toBeLessThanOrEqual(10);
      expect(result.length).toBe(10);
    });
  });

  describe("Optional Fields Handling", () => {
    it("should handle molds with missing optional fields (undefined symptoms/signs/characteristics)", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold N",
                symptoms: ["yellowing"],
                // signs and characteristics are undefined
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], ["spotting"], ["rapid spread"]);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(33); // 1 match / 3 reported
    });

    it("should handle molds with empty arrays for symptoms/signs/characteristics", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold O",
                symptoms: [],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings in reported items and mold items", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold P",
                symptoms: ["", "yellowing"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["", "yellowing"], [], []);

      // Empty strings lowercased are still empty and should match
      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBeGreaterThan(0);
    });

    it("should ensure confidence is always non-negative", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold Q",
                symptoms: ["abc"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup([], [], []);

      // No matches should result in empty array, not negative confidence
      expect(result).toEqual([]);
    });

    it("should handle very long lists of reported items", async () => {
      const longSymptoms = Array.from({length: 100}, (_, i) => `symptom_${i}`);

      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold R",
                symptoms: longSymptoms.slice(0, 50),
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(longSymptoms, [], []);

      expect(result.length).toBe(1);
      expect(result[0]?.confidence).toBe(50); // 50 matches / 100 reported
    });
  });

  describe("Return Type Validation", () => {
    it("should return results with correct LookupResult shape (moldId, moldName, confidence)", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_abc123",
              data: () => ({
                name: "Test Mold",
                symptoms: ["yellowing"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(result.length).toBe(1);
      const lookupResult = result[0];
      expect(lookupResult).toHaveProperty("moldId");
      expect(lookupResult).toHaveProperty("moldName");
      expect(lookupResult).toHaveProperty("confidence");
      expect(lookupResult?.moldId).toBe("mold_abc123");
      expect(lookupResult?.moldName).toBe("Test Mold");
      expect(typeof lookupResult?.confidence).toBe("number");
    });

    it("should return array of LookupResult type", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold S",
                symptoms: ["yellowing"],
                signs: [],
                characteristics: [],
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(typeof result[0]).toBe("object");
        expect(result[0]).toHaveProperty("moldId");
        expect(result[0]).toHaveProperty("moldName");
        expect(result[0]).toHaveProperty("confidence");
      }
    });
  });

  describe("Error Handling", () => {
    it("should return empty array on database error", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(result).toEqual([]);
    });

    it("should handle malformed mold data gracefully", async () => {
      mockDb.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "mold_1",
              data: () => ({
                name: "Mold T",
                // Missing symptoms, signs, characteristics
              }),
            },
          ],
        }),
      });

      const result = await performMoldLookup(["yellowing"], [], []);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });
});
