import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as reportService from "../../../src/services/reportService";

const mockAddReport = jest.fn() as jest.MockedFunction<any>;
const mockFindAllReports = jest.fn() as jest.MockedFunction<any>;
const mockFindReportById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateReport = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteReport = jest.fn() as jest.MockedFunction<any>;
const mockDeleteReport = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/reportRepository", () => ({
  addReport: (...args: any[]) => mockAddReport(...args),
  findAllReports: (...args: any[]) => mockFindAllReports(...args),
  findReportById: (...args: any[]) => mockFindReportById(...args),
  updateReport: (...args: any[]) => mockUpdateReport(...args),
  softDeleteReport: (...args: any[]) => mockSoftDeleteReport(...args),
  deleteReport: (...args: any[]) => mockDeleteReport(...args),
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

describe("reportService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addReportToFirestore", () => {
    it("should add report successfully", async () => {
      const mockDoc = {id: "report123"};
      mockAddReport.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "report123",
        type: "bug",
        description: "Test report",
      });

      const result = await reportService.addReportToFirestore({
        type: "bug",
        description: "Test report",
      } as any);

      expect(result).toEqual({
        id: "report123",
        type: "bug",
        description: "Test report",
      });
      expect(mockAddReport).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddReport.mockResolvedValue(null);

      const result = await reportService.addReportToFirestore({} as any);

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllReports", () => {
    it("should retrieve all reports with pagination", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllReports.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([{id: "1"}, {id: "2"}]);

      const result = await reportService.retrieveAllReports(10, "token");

      expect(result?.snapshot).toEqual([{id: "1"}, {id: "2"}]);
      expect(result?.nextPageToken).toBe("token123");
    });

    it("should return null when no reports found", async () => {
      mockFindAllReports.mockResolvedValue(null);

      const result = await reportService.retrieveAllReports(10);

      expect(result).toBeNull();
    });
  });

  describe("retrieveReportById", () => {
    it("should retrieve report by id", async () => {
      const mockDoc = {exists: true, id: "report123"};
      mockFindReportById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "report123", type: "bug"});

      const result = await reportService.retrieveReportById("report123");

      expect(result).toEqual({id: "report123", type: "bug"});
    });

    it("should return null when report not found", async () => {
      mockFindReportById.mockResolvedValue(null);

      const result = await reportService.retrieveReportById("invalid");

      expect(result).toBeNull();
    });
  });

  describe("updateReportInFirestore", () => {
    it("should update report successfully", async () => {
      mockUpdateReport.mockResolvedValue({writeTime: "2024-01-01"});
      const mockDoc = {id: "report123", status: "resolved"};
      mockFindReportById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "report123",
        status: "resolved",
      });

      const result = await reportService.updateReportInFirestore("report123", {
        status: "resolved",
      });

      expect(result).toEqual({id: "report123", status: "resolved"});
    });

    it("should return null on update failure", async () => {
      mockUpdateReport.mockResolvedValue(null);

      const result = await reportService.updateReportInFirestore("report123", {});

      expect(result).toBeNull();
    });
  });

  describe("softRemoveReport", () => {
    it("should soft delete report successfully", async () => {
      mockSoftDeleteReport.mockResolvedValue({writeTime: "2024-01-01"});

      await reportService.softRemoveReport("report123");

      expect(mockSoftDeleteReport).toHaveBeenCalledWith("report123");
    });
  });

  describe("removeReport", () => {
    it("should hard delete report successfully", async () => {
      mockDeleteReport.mockResolvedValue({writeTime: "2024-01-01"});

      await reportService.removeReport("report123");

      expect(mockDeleteReport).toHaveBeenCalledWith("report123");
    });
  });
});
