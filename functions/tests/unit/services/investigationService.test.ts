import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as investigationService from "../../../src/services/investigationService";

const mockAddInvestigation = jest.fn() as jest.MockedFunction<any>;
const mockFindInvestigationById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateInvestigation = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteInvestigation = jest.fn() as jest.MockedFunction<any>;
const mockDeleteInvestigation = jest.fn() as jest.MockedFunction<any>;
const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/investigationRepository", () => ({
  addInvestigation: (...args: any[]) => mockAddInvestigation(...args),
  findInvestigationById: (...args: any[]) => mockFindInvestigationById(...args),
  updateInvestigation: (...args: any[]) => mockUpdateInvestigation(...args),
  softDeleteInvestigation: (...args: any[]) =>
    mockSoftDeleteInvestigation(...args),
  deleteInvestigation: (...args: any[]) => mockDeleteInvestigation(...args),
}));
jest.mock("../../../src/lib/firestore", () => ({
  documentToJson: (...args: any[]) => mockDocumentToJson(...args),
}));
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("investigationService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addInvestigationToFirestore", () => {
    it("should add investigation successfully", async () => {
      const mockDoc = {id: "inv123"};
      mockAddInvestigation.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "inv123",
        title: "Test Investigation",
      });

      const result = await investigationService.addInvestigationToFirestore({
        title: "Test Investigation",
        description: "Test desc",
      } as any);

      expect(result).toEqual({id: "inv123", title: "Test Investigation"});
      expect(mockAddInvestigation).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockAddInvestigation.mockResolvedValue(null);

      const result = await investigationService.addInvestigationToFirestore(
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe("retrieveInvestigationById", () => {
    it("should retrieve investigation by id", async () => {
      const mockDoc = {exists: true, id: "inv123"};
      mockFindInvestigationById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "inv123"});

      const result = await investigationService.retrieveInvestigationById(
        "inv123"
      );

      expect(result).toEqual({id: "inv123"});
    });

    it("should return null when investigation not found", async () => {
      mockFindInvestigationById.mockResolvedValue(null);

      const result = await investigationService.retrieveInvestigationById(
        "invalid"
      );

      expect(result).toBeNull();
    });
  });

  describe("updateInvestigationInFirestore", () => {
    it("should update investigation successfully", async () => {
      mockUpdateInvestigation.mockResolvedValue({writeTime: "2024-01-01"});
      const mockDoc = {id: "inv123", title: "Updated"};
      mockFindInvestigationById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "inv123", title: "Updated"});

      const result = await investigationService.updateInvestigationInFirestore(
        "inv123",
        {title: "Updated"}
      );

      expect(result).toEqual({id: "inv123", title: "Updated"});
    });

    it("should return null on update failure", async () => {
      mockUpdateInvestigation.mockResolvedValue(null);

      const result = await investigationService.updateInvestigationInFirestore(
        "inv123",
        {}
      );

      expect(result).toBeNull();
    });
  });

  describe("softRemoveInvestigation", () => {
    it("should soft delete investigation successfully", async () => {
      mockSoftDeleteInvestigation.mockResolvedValue({writeTime: "2024-01-01"});

      await investigationService.softRemoveInvestigation("inv123");

      expect(mockSoftDeleteInvestigation).toHaveBeenCalledWith("inv123");
    });
  });

  describe("removeInvestigation", () => {
    it("should hard delete investigation successfully", async () => {
      mockDeleteInvestigation.mockResolvedValue({writeTime: "2024-01-01"});

      await investigationService.removeInvestigation("inv123");

      expect(mockDeleteInvestigation).toHaveBeenCalledWith("inv123");
    });
  });
});
