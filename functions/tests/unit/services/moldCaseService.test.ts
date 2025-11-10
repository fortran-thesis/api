import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldCaseService from "../../../src/services/moldCaseService";
import * as moldCaseRepository from "../../../src/repositories/moldCaseRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/moldCaseRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldCaseRepository = moldCaseRepository as jest.Mocked<
  typeof moldCaseRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("moldCaseService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMoldCaseToFirestore", () => {
    it("should successfully add a mold case", async () => {
      const mockMoldCase = {
        user_id: "user-123",
        name: "Test Case",
        photo_url: "",
        identified_mold: null,
        is_archived: false,
      };

      const mockDocSnapshot = {
        id: "case-123",
        exists: true,
        data: jest.fn().mockReturnValue({
          ...mockMoldCase,
          metadata: {
            created_at: Timestamp.now(),
            updated_at: null,
            deleted_at: null,
          },
        }),
      };

      mockMoldCaseRepository.addMoldCase.mockResolvedValue(
        mockDocSnapshot as any
      );
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "case-123",
        ...mockMoldCase,
      } as any);

      const result = await moldCaseService.addMoldCaseToFirestore(
        mockMoldCase as any
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe("case-123");
    });

    it("should return null on creation failure", async () => {
      mockMoldCaseRepository.addMoldCase.mockResolvedValue(null);

      const result = await moldCaseService.addMoldCaseToFirestore({
        user_id: "user-123",
      } as any);

      expect(result).toBeNull();
    });
  });

  describe("retrieveMoldCaseById", () => {
    it("should retrieve a mold case by ID", async () => {
      const mockDocSnapshot = {
        exists: true,
        data: jest.fn().mockReturnValue({
          id: "case-123",
          user_id: "user-123",
          name: "Test Case",
        }),
      };

      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue(
        mockDocSnapshot as any
      );
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "case-123",
        user_id: "user-123",
      } as any);

      const result = await moldCaseService.retrieveMoldCaseById("case-123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("case-123");
    });
  });
});
