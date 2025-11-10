import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as flagReportService from "../../../src/services/flagReportService";

const mockAddFlagReport = jest.fn() as jest.MockedFunction<any>;
const mockFindAllFlagReports = jest.fn() as jest.MockedFunction<any>;
const mockFindFlagReportById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateFlagReport = jest.fn() as jest.MockedFunction<any>;
const mockDeleteFlagReport = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteFlagReport = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/flagReportRepository", () => ({
  addFlagReport: (...args: any[]) => mockAddFlagReport(...args),
  findAllFlagReports: (...args: any[]) => mockFindAllFlagReports(...args),
  findFlagReportById: (...args: any[]) => mockFindFlagReportById(...args),
  updateFlagReport: (...args: any[]) => mockUpdateFlagReport(...args),
  deleteFlagReport: (...args: any[]) => mockDeleteFlagReport(...args),
  softDeleteFlagReport: (...args: any[]) => mockSoftDeleteFlagReport(...args),
}));
jest.mock("../../../src/lib/firestore", () => ({
  documentToJson: (...args: any[]) => mockDocumentToJson(...args),
  queryToJson: (...args: any[]) => mockQueryToJson(...args),
}));
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("flagReportService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addFlagReportToFirestore", () => {
    it("should add flag report successfully", async () => {
      const mockDoc = {id: "report123"};
      mockAddFlagReport.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "report123", reason: "spam"});

      const result = await flagReportService.addFlagReportToFirestore({
        reported_by: "user123",
        entity_type: "post",
        entity_id: "post456",
        reason: "spam",
      } as any);

      expect(result).toEqual({id: "report123", reason: "spam"});
      expect(mockAddFlagReport).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddFlagReport.mockResolvedValue(null);

      const result = await flagReportService.addFlagReportToFirestore({} as any);

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllFlagReports", () => {
    it("should retrieve all flag reports with pagination", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllFlagReports.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([{id: "1"}, {id: "2"}]);

      const result = await flagReportService.retrieveAllFlagReports(10, "token");

      expect(result?.snapshot).toEqual([{id: "1"}, {id: "2"}]);
      expect(result?.nextPageToken).toBe("token123");
    });

    it("should return null when no reports found", async () => {
      mockFindAllFlagReports.mockResolvedValue(null);

      const result = await flagReportService.retrieveAllFlagReports(10);

      expect(result).toBeNull();
    });
  });

  describe("retrieveFlagReportById", () => {
    it("should retrieve flag report by id", async () => {
      const mockDoc = {exists: true, id: "report123"};
      mockFindFlagReportById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "report123"});

      const result = await flagReportService.retrieveFlagReportById("report123");

      expect(result).toEqual({id: "report123"});
    });

    it("should return null when report not found", async () => {
      mockFindFlagReportById.mockResolvedValue({exists: false});

      const result = await flagReportService.retrieveFlagReportById("invalid");

      expect(result).toBeNull();
    });
  });

  describe("updateFlagReportInFirestore", () => {
    it("should update flag report successfully", async () => {
      mockUpdateFlagReport.mockResolvedValue({writeTime: "2024-01-01"});

      const result = await flagReportService.updateFlagReportInFirestore(
        "report123",
        {status: "resolved"}
      );

      expect(result).toBe(true);
    });

    it("should return false on update failure", async () => {
      mockUpdateFlagReport.mockResolvedValue(null);

      const result = await flagReportService.updateFlagReportInFirestore(
        "report123",
        {}
      );

      expect(result).toBe(false);
    });
  });

  describe("removeFlagReport", () => {
    it("should delete flag report successfully", async () => {
      mockDeleteFlagReport.mockResolvedValue({writeTime: "2024-01-01"});

      const result = await flagReportService.removeFlagReport("report123");

      expect(result).toBe(true);
    });
  });

  describe("softRemoveFlagReport", () => {
    it("should soft delete flag report successfully", async () => {
      mockSoftDeleteFlagReport.mockResolvedValue({writeTime: "2024-01-01"});

      const result = await flagReportService.softRemoveFlagReport("report123");

      expect(result).toBe(true);
    });
  });
});
