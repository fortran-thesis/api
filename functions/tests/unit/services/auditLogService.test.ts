import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as auditLogService from "../../../src/services/auditLogService";
import * as auditLogRepository from "../../../src/repositories/auditLogRepository";
import * as firestoreLib from "../../../src/lib/firestore";

// Mock dependencies
jest.mock("../../../src/repositories/auditLogRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockAuditLogRepository = auditLogRepository as jest.Mocked<
  typeof auditLogRepository
>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("auditLogService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAuditLogsByAction", () => {
    it("should retrieve audit logs by action", async () => {
      const mockSnapshot = {
        docs: [
          {
            id: "log-1",
            data: jest.fn().mockReturnValue({
              user_id: "user-123",
              action: "CREATE",
            }),
          },
          {
            id: "log-2",
            data: jest.fn().mockReturnValue({
              user_id: "user-456",
              action: "CREATE",
            }),
          },
        ],
        empty: false,
      };

      mockAuditLogRepository.findAuditLogsByAction.mockResolvedValue(
        mockSnapshot as any
      );
      mockFirestoreLib.queryToJson.mockReturnValue([
        {id: "log-1", user_id: "user-123", action: "CREATE"},
        {id: "log-2", user_id: "user-456", action: "CREATE"},
      ] as any);

      const result = await auditLogService.getAuditLogsByAction("CREATE");

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(mockAuditLogRepository.findAuditLogsByAction).toHaveBeenCalledWith(
        "CREATE"
      );
    });

    it("should return null when query fails", async () => {
      mockAuditLogRepository.findAuditLogsByAction.mockResolvedValue(null);

      const result = await auditLogService.getAuditLogsByAction("CREATE");

      expect(result).toBeNull();
    });
  });

  describe("getAllAuditLogs", () => {
    it("should retrieve paginated audit logs", async () => {
      const mockSnapshot = {
        docs: [
          {
            id: "log-1",
            data: jest.fn().mockReturnValue({user_id: "user-123"}),
          },
          {
            id: "log-2",
            data: jest.fn().mockReturnValue({user_id: "user-456"}),
          },
        ],
        empty: false,
      };

      mockAuditLogRepository.findAllAuditLogs.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      } as any);
      mockFirestoreLib.queryToJson.mockReturnValue([
        {id: "log-1", user_id: "user-123"},
        {id: "log-2", user_id: "user-456"},
      ] as any);

      const result = await auditLogService.getAllAuditLogs(10);

      expect(result).toBeDefined();
      expect(result?.snapshot).toHaveLength(2);
      expect(mockAuditLogRepository.findAllAuditLogs).toHaveBeenCalledWith(
        10,
        undefined
      );
    });

    it("should return null when query fails", async () => {
      mockAuditLogRepository.findAllAuditLogs.mockResolvedValue(null);

      const result = await auditLogService.getAllAuditLogs(10);

      expect(result).toBeNull();
    });

    it("should pass token for pagination", async () => {
      const mockSnapshot = {
        docs: [],
        empty: true,
      };

      mockAuditLogRepository.findAllAuditLogs.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "next-token",
      } as any);
      mockFirestoreLib.queryToJson.mockReturnValue([] as any);

      const result = await auditLogService.getAllAuditLogs(10, "current-token");

      expect(result).toBeDefined();
      expect(mockAuditLogRepository.findAllAuditLogs).toHaveBeenCalledWith(
        10,
        "current-token"
      );
    });
  });
});
