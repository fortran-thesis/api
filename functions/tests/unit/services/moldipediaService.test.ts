import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as moldipediaService from "../../../src/services/moldipediaService";
import * as moldipediaRepository from "../../../src/repositories/moldipediaRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/moldipediaRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldipediaRepository = moldipediaRepository as jest.Mocked<
  typeof moldipediaRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("moldipediaService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("retrieveAllMoldipedia", () => {
    it("should retrieve all moldipedia entries", async () => {
      const mockSnapshot = {
        docs: [
          {id: "mold-1", data: jest.fn().mockReturnValue({name: "Aspergillus"})},
          {id: "mold-2", data: jest.fn().mockReturnValue({name: "Penicillium"})},
        ],
        empty: false,
      };

      mockMoldipediaRepository.findAllMoldipedia.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      } as any);
      mockFirestoreLib.queryToJson.mockReturnValue([
        {id: "mold-1", name: "Aspergillus"},
        {id: "mold-2", name: "Penicillium"},
      ] as any);

      const result = await moldipediaService.retrieveAllMoldipedia(10);

      expect(result).toBeDefined();
      expect(result?.snapshot).toHaveLength(2);
    });

    it("should return null on query failure", async () => {
      mockMoldipediaRepository.findAllMoldipedia.mockResolvedValue(null);

      const result = await moldipediaService.retrieveAllMoldipedia(10);

      expect(result).toBeNull();
    });
  });

  describe("retrieveMoldipediaById", () => {
    it("should retrieve moldipedia by ID", async () => {
      const mockDocSnapshot = {
        exists: true,
        data: jest.fn().mockReturnValue({
          id: "mold-1",
          name: "Aspergillus",
          description: "Test",
        }),
      };

      mockMoldipediaRepository.findMoldipediaById.mockResolvedValue(
        mockDocSnapshot as any
      );
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "mold-1",
        name: "Aspergillus",
      } as any);

      const result = await moldipediaService.retrieveMoldipediaById("mold-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("mold-1");
    });
  });
});
