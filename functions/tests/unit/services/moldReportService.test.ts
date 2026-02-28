import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as moldReportService from "../../../src/services/moldReportService";

const mockAddMoldReport = jest.fn() as jest.MockedFunction<any>;
const mockFindAllMoldReports = jest.fn() as jest.MockedFunction<any>;
const mockFindMoldReportById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateMoldReport = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteMoldReport = jest.fn() as jest.MockedFunction<any>;
const mockCountReportsByStatuses = jest.fn() as jest.MockedFunction<any>;
const mockCountTotalReports = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;
const mockGetAuthUserById = jest.fn() as jest.MockedFunction<any>;
const mockGetAuthUsersByIds = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/moldReportRepository", () => ({
  addMoldReport: (...args: any[]) => mockAddMoldReport(...args),
  findAllMoldReports: (...args: any[]) => mockFindAllMoldReports(...args),
  findMoldReportById: (...args: any[]) => mockFindMoldReportById(...args),
  updateMoldReport: (...args: any[]) => mockUpdateMoldReport(...args),
  softDeleteMoldReport: (...args: any[]) => mockSoftDeleteMoldReport(...args),
  countReportsByStatuses: (...args: any[]) =>
    mockCountReportsByStatuses(...args),
  countTotalReports: () => mockCountTotalReports(),
}));
jest.mock("../../../src/lib/firestore", () => ({
  documentToJson: (...args: any[]) => mockDocumentToJson(...args),
  queryToJson: (...args: any[]) => mockQueryToJson(...args),
}));
jest.mock("../../../src/lib/auth", () => ({
  getAuthUserById: (...args: any[]) => mockGetAuthUserById(...args),
  getAuthUsersByIds: (...args: any[]) => mockGetAuthUsersByIds(...args),
}));
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/services/moldCaseService", () => ({
  retrieveMoldCaseByReportId: jest.fn().mockResolvedValue(null),
  batchRetrieveMoldCasesByReportIds: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("moldReportService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMoldReportToFirestore", () => {
    it("should add mold report successfully", async () => {
      const mockDoc = {id: "report123"};
      mockAddMoldReport.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "report123",
        location: "Kitchen",
      });

      const result = await moldReportService.addMoldReportToFirestore({
        user_id: "user123",
        location: "Kitchen",
        date_observed: "2024-01-01",
        case_details: [],
      } as any);

      expect(result).toEqual({id: "report123", location: "Kitchen", case_details: []});
      expect(mockAddMoldReport).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddMoldReport.mockResolvedValue(null);

      const result = await moldReportService.addMoldReportToFirestore({} as any);

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllMoldReports", () => {
    it("should retrieve all mold reports with pagination", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllMoldReports.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([
        {id: "1", user_id: "user1", date_observed: new Date()},
        {id: "2", user_id: "user2", date_observed: new Date()},
      ]);
      mockGetAuthUserById.mockResolvedValue(null);
      mockGetAuthUsersByIds.mockResolvedValue(new Map());

      const result = await moldReportService.retrieveAllMoldReports(
        10,
        false,
        "token"
      );

      expect(result?.snapshot).toHaveLength(2);
      expect(result?.nextPageToken).toBe("token123");
    });
  });

  describe("retrieveMoldReportById", () => {
    it("should retrieve mold report by id", async () => {
      const mockDoc = {exists: true, id: "report123"};
      mockFindMoldReportById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "report123",
        user_id: "user1",
        date_observed: new Date(),
      });
      mockGetAuthUserById.mockResolvedValue({
        id: "user1",
        details: {displayName: "John Doe"},
        user: {first_name: "John", last_name: "Doe"},
      });

      const result = await moldReportService.retrieveMoldReportById("report123");

      expect(result).toBeTruthy();
      expect(result?.id).toBe("report123");
    });
  });

  describe("getMoldReportStatusCounts", () => {
    it("should return status counts", async () => {
      mockCountTotalReports.mockResolvedValue(100);
      mockCountReportsByStatuses.mockResolvedValue(25);

      const result = await moldReportService.getMoldReportStatusCounts();

      expect(result).toEqual({
        total: 100,
        pending: 25,
        in_progress: 25,
        resolved: 25,
        closed: 25,
      });
    });

    it("should return null on error", async () => {
      mockCountTotalReports.mockRejectedValue(new Error("DB error"));

      const result = await moldReportService.getMoldReportStatusCounts();

      expect(result).toBeNull();
    });
  });

  describe("updateMoldReportInFirestore", () => {
    it("should update mold report successfully", async () => {
      mockUpdateMoldReport.mockResolvedValue({writeTime: "2024-01-01"});
      const mockDoc = {id: "report123"};
      mockFindMoldReportById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "report123",
        status: "resolved",
        user_id: "user1",
        date_observed: new Date(),
      });
      mockGetAuthUserById.mockResolvedValue(null);

      const result = await moldReportService.updateMoldReportInFirestore(
        "report123",
        {status: "resolved"}
      );

      expect(result?.status).toBe("resolved");
    });
  });

  describe("softRemoveMoldReport", () => {
    it("should soft delete mold report successfully", async () => {
      mockSoftDeleteMoldReport.mockResolvedValue({writeTime: "2024-01-01"});

      await moldReportService.softRemoveMoldReport("report123");

      expect(mockSoftDeleteMoldReport).toHaveBeenCalledWith("report123");
    });
  });
});
