import {describe, it, expect, jest, beforeEach} from "@jest/globals";

// Mock firebase getFirestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("../../../src/utils/cacheManager", () => ({
  getCachedList: jest.fn().mockResolvedValue(null),
  cacheList: jest.fn().mockResolvedValue(undefined),
  invalidateAllLists: jest.fn().mockResolvedValue(undefined),
}));

import {getFirestore} from "firebase-admin/firestore";
import {performMoldLookup} from "../../../src/services/lookupService";

const mockGetFirestore = getFirestore as jest.MockedFunction<any>;

function makeDoc(id: string, dataObj: any) {
  return {
    id,
    data: () => dataObj,
  };
}

describe("lookupService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when no reported items provided", async () => {
    // Arrange: getFirestore not needed because function returns early
    const res = await performMoldLookup([], [], []);
    expect(res).toEqual([]);
  });

  it("matches a mold by symptom and returns 100% confidence", async () => {
    const mockSelect = {
      get: jest.fn().mockResolvedValue({docs: [makeDoc("m1", {name: "Aspergillus Flavus", symptoms: ["yellowing"], signs: [], characteristics: []})]}),
    };
    const mockCollection = {
      select: jest.fn().mockReturnValue(mockSelect),
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
    const mockSelect = {
      get: jest.fn().mockResolvedValue({docs: [makeDoc("m1", {name: "Fusarium", symptoms: ["wilting"], signs: ["brown vascular discoloration"], characteristics: ["survives in soil"]})]}),
    };
    const mockCollection = {
      select: jest.fn().mockReturnValue(mockSelect),
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
});
