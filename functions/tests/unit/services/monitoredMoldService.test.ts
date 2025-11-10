import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as monitoredMoldService from "../../../src/services/monitoredMoldService";

const mockAddMonitoredMold = jest.fn() as jest.MockedFunction<any>;
const mockFindAllMonitoredMolds = jest.fn() as jest.MockedFunction<any>;
const mockFindMonitoredMoldById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateMonitoredMold = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteMonitoredMold = jest.fn() as jest.MockedFunction<any>;
const mockDeleteMonitoredMold = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/monitoredMoldRepository", () => ({
  addMonitoredMold: (...args: any[]) => mockAddMonitoredMold(...args),
  findAllMonitoredMolds: (...args: any[]) => mockFindAllMonitoredMolds(...args),
  findMonitoredMoldById: (...args: any[]) => mockFindMonitoredMoldById(...args),
  updateMonitoredMold: (...args: any[]) => mockUpdateMonitoredMold(...args),
  softDeleteMonitoredMold: (...args: any[]) =>
    mockSoftDeleteMonitoredMold(...args),
  deleteMonitoredMold: (...args: any[]) => mockDeleteMonitoredMold(...args),
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

describe("monitoredMoldService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addMonitoredMoldToFirestore", () => {
    it("should add monitored mold successfully", async () => {
      const mockDoc = {id: "mold123"};
      mockAddMonitoredMold.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "mold123",
        folder_id: "folder1",
        name: "Aspergillus",
      });

      const result = await monitoredMoldService.addMonitoredMoldToFirestore({
        folder_id: "folder1",
        user_id: "user1",
        name: "Aspergillus",
      } as any);

      expect(result).toEqual({
        id: "mold123",
        folder_id: "folder1",
        name: "Aspergillus",
      });
      expect(mockAddMonitoredMold).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddMonitoredMold.mockResolvedValue(null);

      const result = await monitoredMoldService.addMonitoredMoldToFirestore(
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe("retrieveAllMonitoredMolds", () => {
    it("should retrieve all monitored molds by folder", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllMonitoredMolds.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([{id: "1"}, {id: "2"}]);

      const result = await monitoredMoldService.retrieveAllMonitoredMolds(
        "folder1",
        10,
        "token"
      );

      expect(result?.snapshot).toEqual([{id: "1"}, {id: "2"}]);
      expect(result?.nextPageToken).toBe("token123");
    });

    it("should return null when no molds found", async () => {
      mockFindAllMonitoredMolds.mockResolvedValue(null);

      const result = await monitoredMoldService.retrieveAllMonitoredMolds(
        "folder1",
        10
      );

      expect(result).toBeNull();
    });
  });

  describe("retrieveMonitoredMoldById", () => {
    it("should retrieve monitored mold by id", async () => {
      const mockDoc = {exists: true, id: "mold123"};
      mockFindMonitoredMoldById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "mold123", name: "Aspergillus"});

      const result = await monitoredMoldService.retrieveMonitoredMoldById(
        "mold123"
      );

      expect(result).toEqual({id: "mold123", name: "Aspergillus"});
    });

    it("should return null when mold not found", async () => {
      mockFindMonitoredMoldById.mockResolvedValue(null);

      const result = await monitoredMoldService.retrieveMonitoredMoldById(
        "invalid"
      );

      expect(result).toBeNull();
    });
  });

  describe("updateMonitoredMoldInFirestore", () => {
    it("should update monitored mold successfully", async () => {
      mockUpdateMonitoredMold.mockResolvedValue({writeTime: "2024-01-01"});
      const mockDoc = {id: "mold123", name: "Updated"};
      mockFindMonitoredMoldById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "mold123", name: "Updated"});

      const result = await monitoredMoldService.updateMonitoredMoldInFirestore(
        "mold123",
        {name: "Updated"}
      );

      expect(result).toEqual({id: "mold123", name: "Updated"});
    });

    it("should return null on update failure", async () => {
      mockUpdateMonitoredMold.mockResolvedValue(null);

      const result = await monitoredMoldService.updateMonitoredMoldInFirestore(
        "mold123",
        {}
      );

      expect(result).toBeNull();
    });
  });

  describe("softRemoveMonitoredMold", () => {
    it("should soft delete monitored mold successfully", async () => {
      mockSoftDeleteMonitoredMold.mockResolvedValue({writeTime: "2024-01-01"});

      await monitoredMoldService.softRemoveMonitoredMold("mold123");

      expect(mockSoftDeleteMonitoredMold).toHaveBeenCalledWith("mold123");
    });
  });

  describe("removeMonitoredMold", () => {
    it("should hard delete monitored mold successfully", async () => {
      mockDeleteMonitoredMold.mockResolvedValue({writeTime: "2024-01-01"});

      await monitoredMoldService.removeMonitoredMold("mold123");

      expect(mockDeleteMonitoredMold).toHaveBeenCalledWith("mold123");
    });
  });
});
