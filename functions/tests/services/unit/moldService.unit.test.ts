import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldService from "../../../src/services/moldService";
import * as moldRepository from "../../../src/repositories/moldRepository";
import * as firestoreLib from "../../../src/lib/firestore";
import * as redisUtils from "../../../src/utils/redis";
import {Mold} from "../../../src/types/types";

// Mock all external dependencies
jest.mock("../../../src/repositories/moldRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/redis");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldRepository = moldRepository as jest.Mocked<typeof moldRepository>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;
const mockRedisUtils = redisUtils as jest.Mocked<typeof redisUtils>;

describe("moldService (unit)", () => {
  const mockMold: Mold = {
    name: "Test Mold",
    description: "A test mold",
    growth_stage: "Early",
    photo_url: ["http://example.com/photo.jpg"],
  };

  const mockMoldWithId = {
    id: "test-mold-id",
    ...mockMold,
    metadata: {
      created_at: Timestamp.now(),
      updated_at: null,
      deleted_at: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMoldToFirestore", () => {
    it("should successfully add a mold", async () => {
      // Mock repository response
      const mockDocSnapshot = {
        id: "test-mold-id",
        data: jest.fn().mockReturnValue(mockMoldWithId),
        exists: true,
      };
      mockMoldRepository.addMold.mockResolvedValue(mockDocSnapshot as any);

      // Mock firestore conversion
      mockFirestoreLib.documentToJson.mockReturnValue(mockMoldWithId as any);

      // Mock cache deletion
      mockRedisUtils.deleteCachePattern.mockResolvedValue(undefined);

      const result = await moldService.addMoldToFirestore(mockMold);

      expect(result).toEqual(mockMoldWithId);
      expect(mockMoldRepository.addMold).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockMold,
          metadata: expect.objectContaining({
            created_at: expect.any(Timestamp),
            updated_at: null,
            deleted_at: null,
          }),
        })
      );
      expect(mockRedisUtils.deleteCachePattern).toHaveBeenCalledWith(
        "molds:list:*"
      );
    });

    it("should return null on repository failure", async () => {
      mockMoldRepository.addMold.mockResolvedValue(null);

      const result = await moldService.addMoldToFirestore(mockMold);

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      mockMoldRepository.addMold.mockRejectedValue(new Error("Database error"));

      const result = await moldService.addMoldToFirestore(mockMold);

      expect(result).toBeNull();
    });
  });

  describe("retrieveMoldById", () => {
    it("should return cached mold if available", async () => {
      const moldId = "test-mold-id";
      mockRedisUtils.getCache.mockResolvedValue(mockMoldWithId as any);

      const result = await moldService.retrieveMoldById(moldId);

      expect(result).toEqual(mockMoldWithId);
      expect(mockRedisUtils.getCache).toHaveBeenCalledWith(`mold:${moldId}`);
      expect(mockMoldRepository.findMoldById).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache when not in cache", async () => {
      const moldId = "test-mold-id";
      mockRedisUtils.getCache.mockResolvedValue(null);

      const mockDocSnapshot = {
        id: moldId,
        data: jest.fn().mockReturnValue(mockMoldWithId),
        exists: true,
      };
      mockMoldRepository.findMoldById.mockResolvedValue(mockDocSnapshot as any);
      mockFirestoreLib.documentToJson.mockReturnValue(mockMoldWithId as any);

      const result = await moldService.retrieveMoldById(moldId);

      expect(result).toEqual(mockMoldWithId);
      expect(mockMoldRepository.findMoldById).toHaveBeenCalledWith(moldId);
      expect(mockRedisUtils.setCache).toHaveBeenCalledWith(
        `mold:${moldId}`,
        mockMoldWithId,
        300
      );
    });

    it("should return null if mold not found", async () => {
      const moldId = "nonexistent-id";
      mockRedisUtils.getCache.mockResolvedValue(null);
      mockMoldRepository.findMoldById.mockResolvedValue(null);

      const result = await moldService.retrieveMoldById(moldId);

      expect(result).toBeNull();
    });
  });

  describe("retrieveMoldByName", () => {
    it("should return cached mold if available", async () => {
      const moldName = "Test Mold";
      mockRedisUtils.getCache.mockResolvedValue(mockMoldWithId as any);

      const result = await moldService.retrieveMoldByName(moldName);

      expect(result).toEqual(mockMoldWithId);
      expect(mockRedisUtils.getCache).toHaveBeenCalledWith(
        `mold:name:${moldName}`
      );
    });

    it("should fetch from database when not cached", async () => {
      const moldName = "Test Mold";
      mockRedisUtils.getCache.mockResolvedValue(null);

      const mockQuerySnapshot = {
        docs: [
          {id: "test-id", data: jest.fn().mockReturnValue(mockMoldWithId)},
        ],
      };
      mockMoldRepository.findMoldByName.mockResolvedValue(
        mockQuerySnapshot as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([mockMoldWithId] as any);

      const result = await moldService.retrieveMoldByName(moldName);

      expect(result).toEqual(mockMoldWithId);
      expect(mockRedisUtils.setCache).toHaveBeenCalledWith(
        `mold:name:${moldName}`,
        mockMoldWithId,
        300
      );
    });

    it("should return null if no molds found", async () => {
      const moldName = "Nonexistent Mold";
      mockRedisUtils.getCache.mockResolvedValue(null);

      const mockQuerySnapshot = {docs: []};
      mockMoldRepository.findMoldByName.mockResolvedValue(
        mockQuerySnapshot as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([]);

      const result = await moldService.retrieveMoldByName(moldName);

      expect(result).toBeNull();
    });
  });

  describe("updateMoldInFirestore", () => {
    it("should successfully update a mold", async () => {
      const moldId = "test-mold-id";
      const updateData = {name: "Updated Mold Name"};

      // Mock update operation
      const mockWriteResult = {writeTime: Timestamp.now()};
      mockMoldRepository.updateMold.mockResolvedValue(mockWriteResult as any);

      // Mock retrieving updated mold
      const updatedMold = {...mockMoldWithId, ...updateData};
      jest
        .spyOn(moldService, "retrieveMoldById")
        .mockResolvedValue(updatedMold as any);

      const result = await moldService.updateMoldInFirestore(
        moldId,
        updateData
      );

      expect(result).toEqual(updatedMold);
      expect(mockMoldRepository.updateMold).toHaveBeenCalledWith(
        moldId,
        updateData
      );
      expect(mockRedisUtils.deleteCache).toHaveBeenCalledWith(`mold:${moldId}`);
      expect(mockRedisUtils.deleteCachePattern).toHaveBeenCalledWith(
        "molds:list:*"
      );
    });

    it("should return null if update fails", async () => {
      const moldId = "test-mold-id";
      const updateData = {name: "Updated Mold Name"};

      mockMoldRepository.updateMold.mockResolvedValue(null);

      const result = await moldService.updateMoldInFirestore(
        moldId,
        updateData
      );

      expect(result).toBeNull();
    });
  });

  describe("softRemoveMold", () => {
    it("should successfully soft delete a mold", async () => {
      const moldId = "test-mold-id";

      const mockWriteResult = {writeTime: Timestamp.now()};
      mockMoldRepository.softDeleteMold.mockResolvedValue(
        mockWriteResult as any
      );

      await moldService.softRemoveMold(moldId);

      expect(mockMoldRepository.softDeleteMold).toHaveBeenCalledWith(moldId);
      expect(mockRedisUtils.deleteCache).toHaveBeenCalledWith(`mold:${moldId}`);
      expect(mockRedisUtils.deleteCachePattern).toHaveBeenCalledWith(
        "molds:list:*"
      );
    });

    it("should handle soft delete failure gracefully", async () => {
      const moldId = "test-mold-id";

      mockMoldRepository.softDeleteMold.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(moldService.softRemoveMold(moldId)).resolves.not.toThrow();
    });
  });

  describe("removeMold", () => {
    it("should successfully delete a mold permanently", async () => {
      const moldId = "test-mold-id";

      const mockWriteResult = {writeTime: Timestamp.now()};
      mockMoldRepository.deleteMold.mockResolvedValue(mockWriteResult as any);

      await moldService.removeMold(moldId);

      expect(mockMoldRepository.deleteMold).toHaveBeenCalledWith(moldId);
      expect(mockRedisUtils.deleteCache).toHaveBeenCalledWith(`mold:${moldId}`);
      expect(mockRedisUtils.deleteCachePattern).toHaveBeenCalledWith(
        "molds:list:*"
      );
    });

    it("should handle delete failure gracefully", async () => {
      const moldId = "test-mold-id";

      mockMoldRepository.deleteMold.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(moldService.removeMold(moldId)).resolves.not.toThrow();
    });
  });
});
