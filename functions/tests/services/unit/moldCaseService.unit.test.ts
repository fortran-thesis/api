import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldCaseService from "../../../src/services/moldCaseService";
import * as moldCaseRepository from "../../../src/repositories/moldCaseRepository";
import * as firestoreLib from "../../../src/lib/firestore";
import {MoldCase} from "../../../src/types/types";

// Mock all external dependencies
jest.mock("../../../src/repositories/moldCaseRespository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockmoldCaseRepository = moldCaseRepository as jest.Mocked<
  typeof moldCaseRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("moldCaseService (unit)", () => {
  const mockmoldCase: MoldCase = {
    name: "Test Folder",
    user_id: "test-user-id",
    is_archived: false,
    photo_url: "",
    identified_mold: null,
  };

  const mockmoldCaseWithId = {
    id: "test-folder-id",
    ...mockmoldCase,
    metadata: {
      created_at: Timestamp.now(),
      updated_at: null,
      deleted_at: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addmoldCaseToFirestore", () => {
    it("should successfully add a mold folder", async () => {
      const mockDocSnapshot = {
        id: "test-folder-id",
        data: jest.fn().mockReturnValue(mockmoldCaseWithId),
        exists: true,
      };

      mockmoldCaseRepository.addMoldCase.mockResolvedValue(
        mockDocSnapshot as any
      );
      mockFirestoreLib.documentToJson.mockReturnValue(
        mockmoldCaseWithId as any
      );

      const result = await moldCaseService.addMoldCaseToFirestore(mockmoldCase);

      expect(result).toEqual(mockmoldCaseWithId);
      expect(mockmoldCaseRepository.addMoldCase).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockmoldCase,
          metadata: expect.objectContaining({
            created_at: expect.any(Timestamp),
            updated_at: null,
            deleted_at: null,
          }),
        })
      );
    });

    it("should return null on repository failure", async () => {
      mockmoldCaseRepository.addMoldCase.mockResolvedValue(null);

      const result = await moldCaseService.addMoldCaseToFirestore(mockmoldCase);

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      mockmoldCaseRepository.addMoldCase.mockRejectedValue(
        new Error("Database error")
      );

      const result = await moldCaseService.addMoldCaseToFirestore(mockmoldCase);

      expect(result).toBeNull();
    });
  });

  describe("retrievemoldCaseById", () => {
    it("should retrieve mold folder by ID", async () => {
      const folderId = "test-folder-id";
      const mockDocSnapshot = {
        id: folderId,
        data: jest.fn().mockReturnValue(mockmoldCaseWithId),
        exists: true,
      };

      mockmoldCaseRepository.findMoldCaseById.mockResolvedValue(
        mockDocSnapshot as any
      );
      mockFirestoreLib.documentToJson.mockReturnValue(
        mockmoldCaseWithId as any
      );

      const result = await moldCaseService.retrieveMoldCaseById(folderId);

      expect(result).toEqual(mockmoldCaseWithId);
      expect(mockmoldCaseRepository.findMoldCaseById).toHaveBeenCalledWith(
        folderId
      );
    });

    it("should return null if folder not found", async () => {
      const folderId = "nonexistent-folder";
      mockmoldCaseRepository.findMoldCaseById.mockResolvedValue(null);

      const result = await moldCaseService.retrieveMoldCaseById(folderId);

      expect(result).toBeNull();
    });
  });

  describe("retrievemoldCaseByName", () => {
    it("should retrieve mold folder by name", async () => {
      const folderName = "Test Folder";
      const mockQuerySnapshot = {
        docs: [
          {
            id: "test-id",
            data: jest.fn().mockReturnValue(mockmoldCaseWithId),
          },
        ],
      };

      mockmoldCaseRepository.findMoldCaseByName.mockResolvedValue(
        mockQuerySnapshot as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([mockmoldCaseWithId] as any);

      const result = await moldCaseService.retrieveMoldCaseByName(folderName);

      expect(result).toEqual(mockmoldCaseWithId);
      expect(mockmoldCaseRepository.findMoldCaseByName).toHaveBeenCalledWith(
        folderName
      );
    });

    it("should return null if no folders found", async () => {
      const folderName = "Nonexistent Folder";
      const mockQuerySnapshot = {docs: []};

      mockmoldCaseRepository.findMoldCaseByName.mockResolvedValue(
        mockQuerySnapshot as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([]);

      const result = await moldCaseService.retrieveMoldCaseByName(folderName);

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllmoldCasesByUser", () => {
    it("should retrieve paginated mold folders by user", async () => {
      const userId = "test-user-id";
      const limit = 10;
      const mockPaginatedResult = {
        snapshot: [mockmoldCaseWithId],
        nextPageToken: null,
      };

      mockmoldCaseRepository.findAllMoldCases.mockResolvedValue(
        mockPaginatedResult as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([mockmoldCaseWithId]);

      const result = await moldCaseService.retrieveAllMoldCasesByUser(
        userId,
        limit,
        false
      );

      expect(result).toEqual(mockPaginatedResult);
      expect(mockmoldCaseRepository.findAllMoldCases).toHaveBeenCalledWith(
        userId,
        limit,
        false,
        undefined
      );
    });
  });

  describe("updatemoldCaseInFirestore", () => {
    it("should successfully update a mold folder", async () => {
      const folderId = "test-folder-id";
      const updateData = {name: "Updated Folder Name"};
      const mockWriteResult = {};

      jest
        .spyOn(mockmoldCaseRepository, "updateMoldCase")
        .mockResolvedValue(mockWriteResult as any);

      const updatedFolder = {...mockmoldCaseWithId, ...updateData};
      jest
        .spyOn(moldCaseService, "retrieveMoldCaseById")
        .mockResolvedValue(updatedFolder as any);

      const result = await moldCaseService.updateMoldCaseInFirestore(
        folderId,
        updateData
      );

      expect(result).toEqual(updatedFolder);
      expect(
        (mockmoldCaseRepository as any).updatemoldCase
      ).toHaveBeenCalledWith(folderId, updateData);
    });

    it("should return null if update fails", async () => {
      const folderId = "test-folder-id";
      const updateData = {name: "Updated Folder Name"};

      jest
        .spyOn(moldCaseService, "retrieveMoldCaseById")
        .mockResolvedValue(null);

      const result = await moldCaseService.updateMoldCaseInFirestore(
        folderId,
        updateData
      );

      expect(result).toBeNull();
    });
  });

  describe("softRemovemoldCase", () => {
    it("should successfully soft delete a mold folder", async () => {
      const folderId = "test-folder-id";
      const mockWriteResult = {writeTime: Timestamp.now()};

      mockmoldCaseRepository.softDeleteMoldCase.mockResolvedValue(
        mockWriteResult as any
      );

      await moldCaseService.softRemoveMoldCase(folderId);

      expect(mockmoldCaseRepository.softDeleteMoldCase).toHaveBeenCalledWith(
        folderId
      );
    });

    it("should handle soft delete failure gracefully", async () => {
      const folderId = "test-folder-id";

      mockmoldCaseRepository.softDeleteMoldCase.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(
        moldCaseService.softRemoveMoldCase(folderId)
      ).resolves.not.toThrow();
    });
  });

  describe("removemoldCase", () => {
    it("should successfully delete a mold folder permanently", async () => {
      const folderId = "test-folder-id";
      const mockWriteResult = {writeTime: Timestamp.now()};

      mockmoldCaseRepository.deleteMoldCase.mockResolvedValue(
        mockWriteResult as any
      );

      await moldCaseService.removeMoldCase(folderId);

      expect(mockmoldCaseRepository.deleteMoldCase).toHaveBeenCalledWith(
        folderId
      );
    });

    it("should handle delete failure gracefully", async () => {
      const folderId = "test-folder-id";

      mockmoldCaseRepository.deleteMoldCase.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(
        moldCaseService.removeMoldCase(folderId)
      ).resolves.not.toThrow();
    });
  });
});
