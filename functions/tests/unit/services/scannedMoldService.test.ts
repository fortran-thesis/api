import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as scannedMoldService from "../../../src/services/scannedMoldService";
import * as scannedMoldRepository from "../../../src/repositories/scannedMoldRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/scannedMoldRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockScannedMoldRepository = scannedMoldRepository as jest.Mocked<
  typeof scannedMoldRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("scannedMoldService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addScannedMoldToFirestore", () => {
    it("should add a scanned mold", async () => {
      const mockScannedMold = {
        user_id: "user-123",
        mold_id: "mold-456",
        confidence: 0.95,
      };

      mockScannedMoldRepository.addScannedMold.mockResolvedValue({
        id: "scanned-789",
        exists: true,
        data: jest.fn().mockReturnValue(mockScannedMold),
      } as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "scanned-789",
        ...mockScannedMold,
      } as any);

      const result = await scannedMoldService.addScannedMoldToFirestore(
        mockScannedMold as any
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe("scanned-789");
    });

    it("should return null on failure", async () => {
      mockScannedMoldRepository.addScannedMold.mockResolvedValue(null);

      const result = await scannedMoldService.addScannedMoldToFirestore(
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllScannedMolds", () => {
    it("should retrieve all scanned molds", async () => {
      const mockSnapshot = {
        docs: [
          {id: "s1", data: jest.fn().mockReturnValue({user_id: "user-1"})},
          {id: "s2", data: jest.fn().mockReturnValue({user_id: "user-2"})},
        ],
        empty: false,
      };

      mockScannedMoldRepository.findAllScannedMolds.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      } as any);
      mockFirestoreLib.queryToJson.mockReturnValue([
        {id: "s1", user_id: "user-1"},
        {id: "s2", user_id: "user-2"},
      ] as any);

      const result = await scannedMoldService.retrieveAllScannedMolds(10);

      expect(result).toBeDefined();
      expect(result?.snapshot).toHaveLength(2);
    });
  });
});
