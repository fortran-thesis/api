import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldCaseService from "../../../src/services/moldCaseService";
import * as moldCaseRepository from "../../../src/repositories/moldCaseRepository";
import * as cultivationLogRepository from "../../../src/repositories/cultivationLogRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/moldCaseRepository");
jest.mock("../../../src/repositories/cultivationLogRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/utils/storageTransform", () => ({
  transformToSignedUrl: jest.fn(async (url: string) => url),
}));
const mockInvalidateAllLists = jest.fn() as jest.MockedFunction<any>;
const mockUpsertCachedListItem = jest.fn() as jest.MockedFunction<any>;
const mockReplaceCachedListItem = jest.fn() as jest.MockedFunction<any>;
const mockRemoveCachedListItem = jest.fn() as jest.MockedFunction<any>;
const mockGetCachedListDescriptors = jest.fn() as jest.MockedFunction<any>;
const mockDeleteCache = jest.fn() as jest.MockedFunction<any>;
jest.mock("../../../src/utils/cacheManager", () => ({
  cacheItem: jest.fn(),
  getCachedItem: jest.fn(async () => null),
  cacheList: jest.fn(),
  getCachedList: jest.fn(async () => null),
  invalidateAllLists: (...args: any[]) => mockInvalidateAllLists(...args),
  getCachedListDescriptors: (...args: any[]) => mockGetCachedListDescriptors(...args),
  upsertCachedListItem: (...args: any[]) => mockUpsertCachedListItem(...args),
  replaceCachedListItem: (...args: any[]) => mockReplaceCachedListItem(...args),
  removeCachedListItem: (...args: any[]) => mockRemoveCachedListItem(...args),
}));
jest.mock("../../../src/utils/redis", () => ({
  deleteCache: (...args: any[]) => mockDeleteCache(...args),
}));
jest.mock("../../../src/utils/normalizeResponse", () => ({
  normalizeResponseTimestamps: jest.fn((v: unknown) => v),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));
jest.mock("../../../src/services/userService", () => ({
  getRoleCounts: jest.fn(async () => ({})),
  getDisabledCounts: jest.fn(async () => ({})),
}));
jest.mock("../../../src/services/moldReportService", () => ({
  getMoldReportStatusCounts: jest.fn(async () => ({})),
}));
jest.mock("../../../src/lib/auth", () => ({
  getAuthUserById: jest.fn(async () => null),
}));

const mockMoldCaseRepository = moldCaseRepository as jest.Mocked<
  typeof moldCaseRepository
>;
const mockCultivationLogRepository = cultivationLogRepository as jest.Mocked<
  typeof cultivationLogRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("moldCaseService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateAllLists.mockResolvedValue(undefined);
    mockUpsertCachedListItem.mockResolvedValue({});
    mockReplaceCachedListItem.mockResolvedValue({});
    mockRemoveCachedListItem.mockResolvedValue({});
    mockGetCachedListDescriptors.mockResolvedValue([]);
    mockDeleteCache.mockResolvedValue(undefined);
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
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue({
        exists: true,
        id: "case-123",
        data: jest.fn().mockReturnValue({
          id: "case-123",
          user_id: "user-123",
          mycologist_id: "myco-1",
          is_archived: false,
        }),
      } as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "case-123",
        user_id: "user-123",
        mycologist_id: "myco-1",
        is_archived: false,
      } as any);

      const result = await moldCaseService.addMoldCaseToFirestore(
        mockMoldCase as any
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe("case-123");
      expect(mockUpsertCachedListItem).toHaveBeenCalledWith(
        "mold-cases-all",
        expect.objectContaining({id: "case-123", user_id: "user-123"}),
        expect.objectContaining({shouldMutate: expect.any(Function)})
      );
      expect(mockUpsertCachedListItem).toHaveBeenCalledWith(
        "mold-cases-assigned",
        expect.objectContaining({id: "case-123", mycologist_id: "myco-1"}),
        expect.objectContaining({shouldMutate: expect.any(Function)})
      );
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

  // ── Cultivation log CRUD ────────────────────────────────────────────────────

  describe("getCultivationLogsFromCase", () => {
    it("should return paginated cultivation logs", async () => {
      const caseSnap = {exists: true, data: jest.fn().mockReturnValue({id: "case-123"})};
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue(caseSnap as any);
      mockFirestoreLib.documentToJson.mockReturnValue({id: "case-123"} as any);

      const logData = {
        id: "log-1",
        type: "vitro",
        characteristics: {color: "white"},
        additional_info: "",
        image_url: "",
      };
      mockCultivationLogRepository.findCultivationLogsByCaseId.mockResolvedValue({
        docs: [{id: "log-1", data: jest.fn().mockReturnValue(logData)}],
        nextPageToken: null,
      } as any);

      const result = await moldCaseService.getCultivationLogsFromCase("case-123");

      expect(result).not.toBeNull();
      expect(result?.snapshot).toHaveLength(1);
      expect(result?.snapshot?.[0]?.id).toBe("log-1");
    });

    it("should return null when parent case is not found", async () => {
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue(null as any);

      const result = await moldCaseService.getCultivationLogsFromCase("case-missing");

      expect(result).toBeNull();
    });

    it("should return empty snapshot when no logs exist", async () => {
      const caseSnap = {exists: true, data: jest.fn().mockReturnValue({id: "case-123"})};
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue(caseSnap as any);
      mockFirestoreLib.documentToJson.mockReturnValue({id: "case-123"} as any);
      mockCultivationLogRepository.findCultivationLogsByCaseId.mockResolvedValue(null as any);

      const result = await moldCaseService.getCultivationLogsFromCase("case-123");

      expect(result).not.toBeNull();
      expect(result?.snapshot).toHaveLength(0);
    });
  });

  describe("addCultivationLogToCase", () => {
    it("should add and return the created cultivation log", async () => {
      const logData = {
        type: "vitro",
        characteristics: {culture_id: "cult-1", culture_name: "Batch A", color: "white"},
        additional_info: "",
        image_url: "",
      };
      const docSnap = {id: "log-new", data: jest.fn().mockReturnValue(logData)};
      mockCultivationLogRepository.addCultivationLog.mockResolvedValue(docSnap as any);

      const result = await moldCaseService.addCultivationLogToCase("case-123", logData as any);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("log-new");
      expect((result?.characteristics as any)?.culture_name).toBe("Batch A");
    });

    it("should return null when addCultivationLog repository call fails", async () => {
      mockCultivationLogRepository.addCultivationLog.mockResolvedValue(null as any);

      const result = await moldCaseService.addCultivationLogToCase("case-123", {
        type: "vivo",
        characteristics: {},
        additional_info: "",
        image_url: "",
      } as any);

      expect(result).toBeNull();
    });
  });

  describe("removeCultivationLogFromCase", () => {
    it("should return true on successful deletion", async () => {
      mockCultivationLogRepository.deleteCultivationLog.mockResolvedValue({} as any);

      const result = await moldCaseService.removeCultivationLogFromCase("case-123", "log-1");

      expect(result).toBe(true);
      expect(mockCultivationLogRepository.deleteCultivationLog).toHaveBeenCalledWith(
        "case-123",
        "log-1"
      );
    });

    it("should return false when repository returns falsy", async () => {
      mockCultivationLogRepository.deleteCultivationLog.mockResolvedValue(null as any);

      const result = await moldCaseService.removeCultivationLogFromCase("case-123", "log-1");

      expect(result).toBe(false);
    });
  });

  describe("write-path cache mutations", () => {
    it("should replace cached case entries when membership is unchanged", async () => {
      mockMoldCaseRepository.updateMoldCase.mockResolvedValue({writeTime: "2024-01-01"} as any);
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue({
        exists: true,
        id: "case-123",
        data: jest.fn().mockReturnValue({
          id: "case-123",
          user_id: "user-123",
          mycologist_id: "myco-1",
          is_archived: false,
          name: "Updated Case",
        }),
      } as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "case-123",
        user_id: "user-123",
        mycologist_id: "myco-1",
        is_archived: false,
        name: "Updated Case",
      } as any);

      const result = await moldCaseService.updateMoldCaseInFirestore("case-123", {
        name: "Updated Case",
      } as any);

      expect(result?.name).toBe("Updated Case");
      expect(mockReplaceCachedListItem).toHaveBeenCalledWith(
        "mold-cases-all",
        "case-123",
        expect.objectContaining({id: "case-123", name: "Updated Case"}),
        expect.objectContaining({shouldMutate: expect.any(Function)})
      );
      expect(mockInvalidateAllLists).not.toHaveBeenCalled();
    });

    it("should invalidate list caches when case membership changes", async () => {
      mockMoldCaseRepository.updateMoldCase.mockResolvedValue({writeTime: "2024-01-01"} as any);
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue({
        exists: true,
        id: "case-123",
        data: jest.fn().mockReturnValue({
          id: "case-123",
          user_id: "user-123",
          mycologist_id: "myco-1",
          is_archived: true,
        }),
      } as any);
      mockFirestoreLib.documentToJson.mockReturnValue({
        id: "case-123",
        user_id: "user-123",
        mycologist_id: "myco-1",
        is_archived: true,
      } as any);

      await moldCaseService.updateMoldCaseInFirestore("case-123", {
        is_archived: true,
      } as any);

      expect(mockInvalidateAllLists).toHaveBeenCalledWith("mold-cases-all");
      expect(mockInvalidateAllLists).toHaveBeenCalledWith("mold-cases-assigned");
      expect(mockReplaceCachedListItem).not.toHaveBeenCalled();
    });

    it("should remove deleted cases from cached lists", async () => {
      mockMoldCaseRepository.findMoldCaseById.mockResolvedValue({
        exists: true,
        id: "case-123",
        data: jest.fn().mockReturnValue({
          id: "case-123",
          user_id: "user-123",
          mycologist_id: "myco-1",
          is_archived: false,
        }),
      } as any);
      mockMoldCaseRepository.deleteMoldCase.mockResolvedValue({writeTime: "2024-01-01"} as any);

      await moldCaseService.removeMoldCase("case-123");

      expect(mockRemoveCachedListItem).toHaveBeenCalledWith(
        "mold-cases-all",
        "case-123",
        expect.objectContaining({shouldMutate: expect.any(Function)})
      );
      expect(mockRemoveCachedListItem).toHaveBeenCalledWith(
        "mold-cases-assigned",
        "case-123",
        expect.objectContaining({shouldMutate: expect.any(Function)})
      );
    });
  });
});
