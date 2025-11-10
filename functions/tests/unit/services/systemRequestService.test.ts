import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as systemRequestService from "../../../src/services/systemRequestService";

const mockAddSystemRequest = jest.fn() as jest.MockedFunction<any>;
const mockFindAllSystemRequests = jest.fn() as jest.MockedFunction<any>;
const mockFindSystemRequestById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateSystemRequest = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteSystemRequest = jest.fn() as jest.MockedFunction<any>;
const mockDeleteSystemRequest = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/systemRequestRepository", () => ({
  addSystemRequest: (...args: any[]) => mockAddSystemRequest(...args),
  findAllSystemRequests: (...args: any[]) =>
    mockFindAllSystemRequests(...args),
  findSystemRequestById: (...args: any[]) => mockFindSystemRequestById(...args),
  updateSystemRequest: (...args: any[]) => mockUpdateSystemRequest(...args),
  softDeleteSystemRequest: (...args: any[]) =>
    mockSoftDeleteSystemRequest(...args),
  deleteSystemRequest: (...args: any[]) => mockDeleteSystemRequest(...args),
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

describe("systemRequestService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addSystemRequestToFirestore", () => {
    it("should add system request successfully", async () => {
      const mockDoc = {id: "req123"};
      mockAddSystemRequest.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "req123",
        type: "feature",
        description: "New feature request",
      });

      const result = await systemRequestService.addSystemRequestToFirestore({
        type: "feature",
        description: "New feature request",
      } as any);

      expect(result).toEqual({
        id: "req123",
        type: "feature",
        description: "New feature request",
      });
      expect(mockAddSystemRequest).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddSystemRequest.mockResolvedValue(null);

      const result = await systemRequestService.addSystemRequestToFirestore(
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllSystemRequests", () => {
    it("should retrieve all system requests with pagination", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllSystemRequests.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([{id: "1"}, {id: "2"}]);

      const result = await systemRequestService.retrieveAllSystemRequests(
        10,
        "token"
      );

      expect(result?.snapshot).toEqual([{id: "1"}, {id: "2"}]);
      expect(result?.nextPageToken).toBe("token123");
    });

    it("should return null when no requests found", async () => {
      mockFindAllSystemRequests.mockResolvedValue(null);

      const result = await systemRequestService.retrieveAllSystemRequests(10);

      expect(result).toBeNull();
    });
  });

  describe("retrieveSystemRequestById", () => {
    it("should retrieve system request by id", async () => {
      const mockDoc = {exists: true, id: "req123"};
      mockFindSystemRequestById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "req123", type: "feature"});

      const result = await systemRequestService.retrieveSystemRequestById(
        "req123"
      );

      expect(result).toEqual({id: "req123", type: "feature"});
    });

    it("should return null when request not found", async () => {
      mockFindSystemRequestById.mockResolvedValue(null);

      const result = await systemRequestService.retrieveSystemRequestById(
        "invalid"
      );

      expect(result).toBeNull();
    });
  });

  describe("updateSystemRequestInFirestore", () => {
    it("should update system request successfully", async () => {
      mockUpdateSystemRequest.mockResolvedValue({writeTime: "2024-01-01"});
      const mockDoc = {id: "req123", status: "approved"};
      mockFindSystemRequestById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "req123", status: "approved"});

      const result = await systemRequestService.updateSystemRequestInFirestore(
        "req123",
        {status: "approved"}
      );

      expect(result).toEqual({id: "req123", status: "approved"});
    });

    it("should return null on update failure", async () => {
      mockUpdateSystemRequest.mockResolvedValue(null);

      const result = await systemRequestService.updateSystemRequestInFirestore(
        "req123",
        {}
      );

      expect(result).toBeNull();
    });
  });

  describe("removeSystemRequest", () => {
    it("should delete system request successfully", async () => {
      mockDeleteSystemRequest.mockResolvedValue(undefined);

      await systemRequestService.removeSystemRequest("req123");

      expect(mockDeleteSystemRequest).toHaveBeenCalledWith("req123");
    });
  });

  describe("softRemoveSystemRequest", () => {
    it("should soft delete system request successfully", async () => {
      mockSoftDeleteSystemRequest.mockResolvedValue(undefined);

      await systemRequestService.softRemoveSystemRequest("req123");

      expect(mockSoftDeleteSystemRequest).toHaveBeenCalledWith("req123");
    });
  });
});
