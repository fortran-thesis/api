import {describe, it, expect, jest, beforeEach} from "@jest/globals";

// Mock firebase getFirestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("../../../src/utils/cacheManager", () => ({
  getCachedItem: jest.fn(),
  cacheItem: jest.fn(),
}));

import {getFirestore} from "firebase-admin/firestore";
import {performMoldLookup} from "../../../src/services/lookupService";
import {getCachedItem, cacheItem} from "../../../src/utils/cacheManager";

const mockGetFirestore = getFirestore as jest.MockedFunction<any>;
const mockGetCachedItem = getCachedItem as jest.MockedFunction<typeof getCachedItem>;
const mockCacheItem = cacheItem as jest.MockedFunction<typeof cacheItem>;

function makeDoc(id: string, dataObj: any) {
  return {
    id,
    data: () => dataObj,
  };
}

describe("lookupService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedItem.mockResolvedValue(null);
    mockCacheItem.mockResolvedValue(undefined);
  });

  it("returns empty array when no reported items provided", async () => {
    // Arrange: getFirestore not needed because function returns early
    const res = await performMoldLookup([], [], []);
    expect(res).toEqual([]);
  });

  it("matches a mold by symptom and returns 100% confidence", async () => {
    // Mock Firestore collection get
    const mockCollection = {
      get: jest.fn().mockResolvedValue({docs: [makeDoc("m1", {name: "Aspergillus Flavus", symptoms: ["yellowing"], signs: [], characteristics: []})]})
    };

    mockGetFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue(mockCollection),
    });

    const results = await performMoldLookup(["yellowing"], [], []);
    expect(results).toHaveLength(1);
    expect(results[0].moldId).toBe("m1");
    expect(results[0].confidence).toBe(100);
  });

  it("calculates correct confidence with mixed matches", async () => {
    const mockCollection = {
      get: jest.fn().mockResolvedValue({docs: [makeDoc("m1", {name: "Fusarium", symptoms: ["wilting"], signs: ["brown vascular discoloration"], characteristics: ["survives in soil"]})]})
    };

    mockGetFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue(mockCollection),
    });

    const reportedSymptoms = ["wilting", "other"];
    const reportedSigns = ["brown vascular discoloration"];
    const reportedChars = ["unknown"];

    // total reported = 4
    // matches = symptoms:1 + signs:1 =2 -> confidence = 50
    const results = await performMoldLookup(reportedSymptoms, reportedSigns, reportedChars);
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe(50);
  });

  it("excludes soft-deleted molds from lookup catalog", async () => {
    const mockCollection = {
      get: jest.fn().mockResolvedValue({
        docs: [
          makeDoc("m-active", {
            name: "Active Mold",
            symptoms: ["yellowing"],
            signs: [],
            characteristics: [],
            metadata: {deleted_at: null},
          }),
          makeDoc("m-deleted", {
            name: "Deleted Mold",
            symptoms: ["yellowing"],
            signs: [],
            characteristics: [],
            metadata: {deleted_at: {seconds: 1}},
          }),
        ],
      }),
    };

    mockGetFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue(mockCollection),
    });

    const results = await performMoldLookup(["yellowing"], [], []);
    expect(results).toHaveLength(1);
    expect(results[0].moldId).toBe("m-active");
  });

  it("uses cached lookup catalog when available", async () => {
    mockGetCachedItem.mockResolvedValueOnce([
      {
        moldId: "m-cached",
        moldName: "Cached Mold",
        moldNameNormalized: "cached mold",
        symptoms: ["yellowing"],
        signs: [],
        characteristics: [],
        symptomLookup: {yellowing: true},
        signLookup: {},
        characteristicLookup: {},
      },
    ] as any);

    const results = await performMoldLookup(["yellowing"], [], []);

    expect(results).toHaveLength(1);
    expect(results[0].moldId).toBe("m-cached");
    expect(mockGetFirestore).not.toHaveBeenCalled();
  });
});
