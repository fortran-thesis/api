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
const mockGenerateNextDailyCaseName = jest.fn() as jest.MockedFunction<any>;
const mockInvalidateAllLists = jest.fn() as jest.MockedFunction<any>;
const mockRetrieveMoldById = jest.fn() as jest.MockedFunction<any>;
const mockRetrieveMoldByName = jest.fn() as jest.MockedFunction<any>;
const mockRetrieveMoldipediaById = jest.fn() as jest.MockedFunction<any>;
const mockRetrieveMoldCaseByReportId = jest.fn() as jest.MockedFunction<any>;
const mockBatchRetrieveMoldCasesByReportIds = jest.fn() as jest.MockedFunction<any>;
const mockGetCultivationLogsFromCase = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/moldReportRepository", () => ({
  addMoldReport: (...args: any[]) => mockAddMoldReport(...args),
  findAllMoldReports: (...args: any[]) => mockFindAllMoldReports(...args),
  findMoldReportById: (...args: any[]) => mockFindMoldReportById(...args),
  updateMoldReport: (...args: any[]) => mockUpdateMoldReport(...args),
  softDeleteMoldReport: (...args: any[]) => mockSoftDeleteMoldReport(...args),
  countReportsByStatuses: (...args: any[]) =>
    mockCountReportsByStatuses(...args),
  countTotalReports: () => mockCountTotalReports(),
  generateNextDailyCaseName: (...args: any[]) => mockGenerateNextDailyCaseName(...args),
}));
jest.mock("../../../src/lib/firestore", () => ({
  documentToJson: (...args: any[]) => mockDocumentToJson(...args),
  queryToJson: (...args: any[]) => mockQueryToJson(...args),
}));
jest.mock("../../../src/lib/auth", () => ({
  getAuthUserById: (...args: any[]) => mockGetAuthUserById(...args),
  getAuthUsersByIds: (...args: any[]) => mockGetAuthUsersByIds(...args),
}));
jest.mock("../../../src/utils/cacheManager", () => ({
  invalidateAllLists: (...args: any[]) => mockInvalidateAllLists(...args),
  cacheItem: jest.fn(),
  getCachedItem: jest.fn(),
  cacheList: jest.fn(),
  getCachedList: jest.fn(),
}));
jest.mock("../../../src/utils/dev");
const mockFindAllCaseDetailsByReportId = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/caseDetailRepository", () => ({
  findAllCaseDetailsByReportId: (...args: any[]) =>
    mockFindAllCaseDetailsByReportId(...args),
  addCaseDetail: jest.fn(),
  updateCaseDetail: jest.fn(),
}));

jest.mock("../../../src/services/moldCaseService", () => ({
  retrieveMoldCaseByReportId: (...args: any[]) => mockRetrieveMoldCaseByReportId(...args),
  batchRetrieveMoldCasesByReportIds: (...args: any[]) => mockBatchRetrieveMoldCasesByReportIds(...args),
  getCultivationLogsFromCase: (...args: any[]) => mockGetCultivationLogsFromCase(...args),
}));
jest.mock("../../../src/services/moldService", () => ({
  retrieveMoldById: (...args: any[]) => mockRetrieveMoldById(...args),
  retrieveMoldByName: (...args: any[]) => mockRetrieveMoldByName(...args),
}));
jest.mock("../../../src/services/moldipediaService", () => ({
  retrieveMoldipediaById: (...args: any[]) => mockRetrieveMoldipediaById(...args),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("moldReportService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateNextDailyCaseName.mockResolvedValue("CASE-2026-001");
    mockInvalidateAllLists.mockResolvedValue(undefined);
    mockRetrieveMoldCaseByReportId.mockResolvedValue(null);
    mockBatchRetrieveMoldCasesByReportIds.mockResolvedValue(new Map());
    mockGetCultivationLogsFromCase.mockResolvedValue({snapshot: [], nextPageToken: null});
    mockRetrieveMoldById.mockResolvedValue(null);
    mockRetrieveMoldByName.mockResolvedValue(null);
    mockRetrieveMoldipediaById.mockResolvedValue(null);
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

      expect(result).toEqual({id: "report123", location: "Kitchen", case_details: [], _caseDetailIds: []});
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
      mockFindAllCaseDetailsByReportId.mockResolvedValue([]);

      const result = await moldReportService.retrieveMoldReportById("report123");

      expect(result).toBeTruthy();
      expect(result?.id).toBe("report123");
    });
  });

  describe("getRawCaseCoverPhoto", () => {
    it("should return first available raw GS path from case details", async () => {
      mockFindAllCaseDetailsByReportId.mockResolvedValue([
        {id: "detail1", data: () => ({cover_photo: ["gs://bucket/raw1.jpg"]})},
        {id: "detail2", data: () => ({cover_photo: ["gs://bucket/raw2.jpg"]})},
      ] as any);

      const result = await moldReportService.getRawCaseCoverPhoto("report123");

      expect(result).toBe("gs://bucket/raw2.jpg");
    });

    it("should return null when no valid photo is found", async () => {
      mockFindAllCaseDetailsByReportId.mockResolvedValue([
        {id: "detail1", data: () => ({cover_photo: []})},
      ] as any);

      const result = await moldReportService.getRawCaseCoverPhoto("report123");

      expect(result).toBeNull();
    });
  });

  describe("retrieveMoldReportPrintPayload", () => {
    it("includes follow-ups and investigation evidence when case details and logs exist", async () => {
      const preloadedReport = {
        id: "report-1",
        user_id: "farmer-1",
        status: "resolved",
        case_name: "MR-2026-0001",
        host: "Tomato",
        location: "Laguna",
        date_observed: "2026-04-01T00:00:00.000Z",
        case_details: [
          {
            id: "detail-1",
            description: "Farmer follow-up details",
            cover_photo: ["https://example.com/follow-up.jpg"],
            metadata: {created_at: {_seconds: 1713436800}},
          },
        ],
        lookup_results: [
          {
            moldId: "mold-1",
            moldName: "Fusarium",
            confidence: 0.86,
          },
        ],
      } as any;

      mockRetrieveMoldCaseByReportId.mockResolvedValue({
        id: "case-1",
        mycologist_id: "myc-1",
        cultivation_details: {
          initial_microscopic: "Fusarium",
          initial_macroscopic: "Brown lesions",
          initial_symptoms: ["Leaf spots"],
          initial_signs: ["Dark margins"],
          initial_characteristics: ["Water-soaked"],
          microscopic_ai_snapshot: {
            identified_mold: "Fusarium",
            confidence: 0.91,
          },
        },
        final_verdict: {
          moldId: "mold-1",
          moldName: "Fusarium",
          confidence: 88,
        },
      } as any);

      mockGetCultivationLogsFromCase.mockResolvedValue({
        snapshot: [
          {
            id: "log-vivo",
            type: "vivo",
            created_at: "2026-04-18T10:00:00.000Z",
            additional_info: "Observed in field",
            characteristics: {
              lesion_color: "Dark brown",
              lesion_size: "8",
              microscopic_identification: "Fusarium",
              confidence: 0.82,
            },
          },
          {
            id: "log-vitro",
            type: "vitro",
            created_at: "2026-04-17T09:00:00.000Z",
            additional_info: "Observed in lab",
            characteristics: {
              colony_color: "White",
              colony_diameter: "20",
              microscopic_identification: "Fusarium",
              confidence: 0.79,
            },
          },
        ],
        nextPageToken: null,
      });

      mockRetrieveMoldById.mockResolvedValue({
        id: "mold-1",
        name: "Fusarium",
        mold_details: {
          info: {
            overview: "Overview",
            description: "Description",
            health_risks: "Risk",
            affected_hosts: ["Tomato"],
            symptoms_and_signs: "Symptoms",
            prevention_summary: "Prevention",
            additional_info: [],
          },
          prevention: {
            physicalControl: "Physical",
            culturalControl: "Cultural",
            biologicalControl: "Biological",
            mechanicalControl: "Mechanical",
            chemicalControl: "Chemical",
          },
        },
      } as any);

      const payload = await moldReportService.retrieveMoldReportPrintPayload(
        "report-1",
        preloadedReport,
      );

      expect(payload).toBeTruthy();
      expect(payload?.follow_ups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            detail_id: "detail-1",
            description: "Farmer follow-up details",
          }),
        ]),
      );
      expect(payload?.investigation?.initial_observation).toEqual(
        expect.objectContaining({
          microscopic_identification: "Fusarium",
        }),
      );
      expect(payload?.investigation?.in_vivo_latest).toEqual(
        expect.objectContaining({
          identified_mold: "Fusarium",
          summary: expect.any(String),
        }),
      );
      expect(payload?.investigation?.in_vitro_latest).toEqual(
        expect.objectContaining({
          identified_mold: "Fusarium",
          summary: expect.any(String),
        }),
      );
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
        rejected: 25,
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
