import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldService from "../../../src/services/moldService";
import * as moldRepository from "../../../src/repositories/moldRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/moldRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/utils/redis");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldRepository = moldRepository as jest.Mocked<typeof moldRepository>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("moldService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMoldToFirestore", () => {
    it("should successfully add a mold", async () => {
      const mockMold = {
        name: "Aspergillus",
        photo_url: ["photo1.jpg"],
      };

      const mockDocSnapshot = {
        id: "mold-123",
        exists: true,
        data: jest.fn().mockReturnValue({
          ...mockMold,
          metadata: {
            created_at: Timestamp.now(),
            updated_at: null,
            deleted_at: null,
          },
        }),
      };

      mockMoldRepository.addMold.mockResolvedValue(mockDocSnapshot as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "mold-123",
        ...mockMold,
      } as any);

      const result = await moldService.addMoldToFirestore(mockMold as any);

      expect(result).toBeDefined();
      expect(result?.id).toBe("mold-123");
    });

    it("should return null on creation failure", async () => {
      mockMoldRepository.addMold.mockResolvedValue(null);

      const result = await moldService.addMoldToFirestore({
        name: "Test",
      } as any);

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllMolds", () => {
    it("should retrieve paginated molds", async () => {
      const mockSnapshot = {
        docs: [
          {id: "mold-1", data: jest.fn().mockReturnValue({name: "Mold1"})},
          {id: "mold-2", data: jest.fn().mockReturnValue({name: "Mold2"})},
        ],
        empty: false,
      };

      mockMoldRepository.findAllMolds.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      } as any);
      mockFirestoreLib.queryToJson.mockReturnValue([
        {id: "mold-1", name: "Mold1"},
        {id: "mold-2", name: "Mold2"},
      ] as any);

      const result = await moldService.retrieveAllMolds(10);

      expect(result).toBeDefined();
      expect(result?.snapshot).toHaveLength(2);
    });
  });

  describe("retrieveMoldById", () => {
    it("should retrieve mold by ID", async () => {
      const mockDocSnapshot = {
        exists: true,
        data: jest.fn().mockReturnValue({
          id: "mold-1",
          name: "Aspergillus",
        }),
      };

      mockMoldRepository.findMoldById.mockResolvedValue(mockDocSnapshot as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "mold-1",
        name: "Aspergillus",
      } as any);

      const result = await moldService.retrieveMoldById("mold-1");

      expect(result).toBeDefined();
      expect(result?.name).toBe("Aspergillus");
    });
  });
});
