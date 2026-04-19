import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as moldController from "../../src/controllers/moldController";
import * as moldService from "../../src/services/moldService";
import * as responseUtils from "../../src/utils/response";
import * as storageLib from "../../src/lib/storage";
import * as loggingUtils from "../../src/utils/logging";
import {AuditAction} from "../../src/types/enums";

// Mock all external dependencies
jest.mock("../../src/services/moldService");
jest.mock("../../src/utils/response");
jest.mock("../../src/lib/storage");
jest.mock("../../src/utils/logging");
jest.mock("../../src/utils/dev");
jest.mock("../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldService = moldService as jest.Mocked<typeof moldService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;
const mockStorageLib = storageLib as jest.Mocked<typeof storageLib>;
const mockLoggingUtils = loggingUtils as jest.Mocked<typeof loggingUtils>;

describe("moldController (unit)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      body: {},
      query: {},
      files: [],
      user: {
        id: "test-user-id",
        user: {
          username: "testuser",
          role: "USER" as any,
          is_banned: false,
        },
        details: {
          email: "test@example.com",
        },
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock response utilities
    mockResponseUtils.sendSuccess.mockReturnValue(undefined as any);
    mockResponseUtils.sendError.mockReturnValue(undefined as any);
    mockResponseUtils.defaultError.mockReturnValue(undefined as any);
  });

  describe("createMold", () => {
    it("should successfully create a mold with photos", async () => {
      const moldDetails = {
        name: "Test Mold",
        description: "A test mold",
        growth_stage: "Early",
      };

      const mockCreatedMold = {
        id: "test-mold-id",
        name: "Test Mold",
        mold_details: moldDetails,
      };

      mockReq.body = {moldName: "Test Mold", details: moldDetails};

      mockMoldService.addMoldToFirestore.mockResolvedValue(
        mockCreatedMold as any
      );

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.addMoldToFirestore).toHaveBeenCalledWith({
        name: "Test Mold",
        mold_details: moldDetails,
        status: "draft",
      });
      expect(mockMoldService.addMoldToFirestore).toHaveBeenCalledWith({
        name: "Test Mold",
        mold_details: moldDetails,
        status: "draft",
      });
      // Audit logging handled by middleware, not checked here
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockCreatedMold
      );
    });

    it("should enrich mold info fields into additional_info for creation", async () => {
      const moldDetails = {
        info: {
          description: "A test mold",
          taxonomy: {
            kingdom: "Fungi",
            phylum: "Ascomycota",
            class: "Eurotiomycetes",
            order: "Eurotiales",
            family: "Testaceae",
            genus: "Testus",
          },
          overview: "Overview text",
          health_risks: "Health risks text",
          affected_hosts: "Affected hosts text",
          symptoms_and_signs: "Symptoms signs text",
          disease_cycle_spread_impact: "Cycle spread impact text",
          prevention_summary: "Prevention summary text",
          additional_info: [
            { title: "Overview", description: "Overview text" },
            { title: "Health Risks", description: "Health risks text" },
            { title: "Affected Hosts", description: "Affected hosts text" },
            { title: "Symptoms and Signs", description: "Symptoms signs text" },
            { title: "Disease Cycle / Spread / Impact", description: "Cycle spread impact text" },
            { title: "Prevention Summary", description: "Prevention summary text" },
          ],
        },
        prevention: {
          physicalControl: "p",
          mechanicalControl: "m",
          culturalControl: "c",
          biologicalControl: "b",
          chemicalControl: "ch",
        },
      };

      const mockCreatedMold = {
        id: "test-mold-id",
        name: "Test Mold",
        mold_details: moldDetails,
      };

      mockReq.body = {moldName: "Test Mold", details: moldDetails};
      mockMoldService.addMoldToFirestore.mockResolvedValue(mockCreatedMold as any);

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.addMoldToFirestore).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Mold",
          mold_details: expect.objectContaining({
            info: expect.objectContaining({
              additional_info: expect.arrayContaining([
                { title: "Overview", description: "Overview text" },
                { title: "Health Risks", description: "Health risks text" },
                { title: "Affected Hosts", description: "Affected hosts text" },
                { title: "Symptoms and Signs", description: "Symptoms signs text" },
                { title: "Disease Cycle / Spread / Impact", description: "Cycle spread impact text" },
                { title: "Prevention Summary", description: "Prevention summary text" },
              ]),
            }),
          }),
        })
      );

      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockCreatedMold);
    });

    it("should preserve promoted root info/prevention payloads", async () => {
      const promotedInfo = {
        description: "Promoted description",
        overview: "Promoted overview",
      };
      const promotedPrevention = {
        physicalControl: "Improve airflow",
        chemicalControl: "Use approved fungicide",
      };

      const mockCreatedMold = {
        id: "promoted-mold-id",
        name: "Promoted Mold",
        mold_details: {
          info: promotedInfo,
          prevention: promotedPrevention,
        },
      };

      mockReq.body = {
        moldName: "Promoted Mold",
        info: promotedInfo,
        prevention: promotedPrevention,
      };

      mockMoldService.addMoldToFirestore.mockResolvedValue(mockCreatedMold as any);

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.addMoldToFirestore).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Promoted Mold",
          mold_details: expect.objectContaining({
            info: expect.objectContaining({
              description: "Promoted description",
              overview: "Promoted overview",
            }),
            prevention: expect.objectContaining({
              physicalControl: "Improve airflow",
              chemicalControl: "Use approved fungicide",
            }),
          }),
          status: "draft",
        })
      );

      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "promoted-mold-id",
          name: "Promoted Mold",
          mold_details: expect.objectContaining({
            info: expect.objectContaining({
              description: "Promoted description",
              overview: "Promoted overview",
            }),
            prevention: expect.objectContaining({
              physicalControl: "Improve airflow",
              chemicalControl: "Use approved fungicide",
            }),
          }),
        })
      );
    });

    it("should handle mold creation failure", async () => {
      const moldDetails = {
        name: "Test Mold",
        description: "A test mold",
        growth_stage: "Early",
      };

      mockReq.body = {moldName: "Test Mold", details: moldDetails};

      mockMoldService.addMoldToFirestore.mockResolvedValue(null);

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Failed to retrieve mold",
        404
      );
    });

    it("should handle service errors", async () => {
      const moldDetails = {
        name: "Test Mold",
        description: "A test mold",
        growth_stage: "Early",
      };

      mockReq.body = {moldName: "Test Mold", details: moldDetails};

      mockMoldService.addMoldToFirestore.mockRejectedValue(new Error("Service failed"));

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(mockRes);
    });
  });

  describe("getAllMolds", () => {
    it("should return paginated molds with default parameters", async () => {
      const mockPaginatedResult = {
        snapshot: [
          {
            id: "mold1",
            name: "Mold 1",
            description: "Test mold 1",
            growth_stage: "Early",
            photo_url: ["http://example.com/photo1.jpg"],
          },
          {
            id: "mold2",
            name: "Mold 2",
            description: "Test mold 2",
            growth_stage: "Late",
            photo_url: ["http://example.com/photo2.jpg"],
          },
        ],
        nextPageToken: null,
      };

      mockReq.query = {};
      mockMoldService.retrieveAllMolds.mockResolvedValue(
        mockPaginatedResult as any
      );

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveAllMolds).toHaveBeenCalledWith(
        10,
        undefined
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockPaginatedResult
      );
    });

    it("should use custom limit and pageToken", async () => {
      const mockPaginatedResult = {
        snapshot: [],
        nextPageToken: null,
      };

      mockReq.query = {limit: "5", pageToken: "token123"};
      mockMoldService.retrieveAllMolds.mockResolvedValue(
        mockPaginatedResult as any
      );

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveAllMolds).toHaveBeenCalledWith(
        5,
        "token123"
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockPaginatedResult
      );
    });

    it("should return 404 when no molds found", async () => {
      mockReq.query = {};
      mockMoldService.retrieveAllMolds.mockResolvedValue(null);

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Failed to retrieve molds",
        404
      );
    });
  });

  describe("getMoldById", () => {
    it("should return mold when found", async () => {
      const moldId = "test-mold-id";
      const mockMold = {
        id: moldId,
        name: "Test Mold",
        description: "A test mold",
        growth_stage: "Early",
        photo_url: ["http://example.com/photo.jpg"],
      };

      mockReq.params = {id: moldId};
      mockMoldService.retrieveMoldById.mockResolvedValue(mockMold as any);

      await moldController.getMoldById(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldById).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockMold
      );
    });

    it("should return 404 when mold not found", async () => {
      const moldId = "nonexistent-mold";
      mockReq.params = {id: moldId};
      mockMoldService.retrieveMoldById.mockResolvedValue(null);

      await moldController.getMoldById(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldById).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Failed to retrieve mold",
        404
      );
    });
  });

  describe("getMoldByName", () => {
    it("should return mold when found by name", async () => {
      const moldName = "Test Mold";
      const mockMold = {
        id: "test-mold-id",
        name: moldName,
        description: "A test mold",
        growth_stage: "Early",
        photo_url: ["http://example.com/photo.jpg"],
      };

      mockReq.params = {name: moldName};
      mockMoldService.retrieveMoldByName.mockResolvedValue(mockMold as any);

      await moldController.getMoldByName(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockMoldService.retrieveMoldByName).toHaveBeenCalledWith(moldName);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockMold
      );
    });

    it("should return 404 when mold not found by name", async () => {
      const moldName = "Nonexistent Mold";
      mockReq.params = {name: moldName};
      mockMoldService.retrieveMoldByName.mockResolvedValue(null);

      await moldController.getMoldByName(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockMoldService.retrieveMoldByName).toHaveBeenCalledWith(moldName);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Failed to retrieve mold",
        404
      );
    });
  });

  describe("getSupportedCorrectionGenera", () => {
    it("should return all canonical genera with display-friendly labels", async () => {
      mockMoldService.retrieveMoldByPredictedClassName.mockResolvedValue(null as any);

      await moldController.getSupportedCorrectionGenera(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockMoldService.retrieveMoldByPredictedClassName).toHaveBeenCalledWith(
        "Alternaria_spp"
      );
      expect(mockMoldService.retrieveMoldByPredictedClassName).toHaveBeenCalledWith(
        "Aspergillus_section_Flavi"
      );
      expect(mockMoldService.retrieveMoldByPredictedClassName).toHaveBeenCalledWith(
        "Aspergillus_section_Nigri"
      );

      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          genera: expect.arrayContaining([
            expect.objectContaining({
              display_name: "Aspergillus Flavi",
              normalized_key: "aspergillus flavi",
              predicted_class_name: "Aspergillus_section_Flavi",
            }),
            expect.objectContaining({
              display_name: "Aspergillus Nigri",
              normalized_key: "aspergillus nigri",
              predicted_class_name: "Aspergillus_section_Nigri",
            }),
          ]),
        })
      );
    });

    it("should keep six correction genera even when only a subset exists in system", async () => {
      mockMoldService.retrieveMoldByPredictedClassName.mockImplementation(
        async (predictedClassName: string) => {
          if (predictedClassName === "Alternaria_spp") {
            return {id: "mold-1", status: "reviewed"} as any;
          }
          return null as any;
        }
      );

      await moldController.getSupportedCorrectionGenera(
        mockReq as Request,
        mockRes as Response
      );

      const payload = mockResponseUtils.sendSuccess.mock.calls[0][1] as any;
      expect(Array.isArray(payload.genera)).toBe(true);
      expect(payload.genera).toHaveLength(6);
      expect(payload.genera).toEqual(
        expect.arrayContaining([
          expect.objectContaining({predicted_class_name: "Alternaria_spp"}),
          expect.objectContaining({predicted_class_name: "Aspergillus_section_Flavi"}),
          expect.objectContaining({predicted_class_name: "Aspergillus_section_Nigri"}),
          expect.objectContaining({predicted_class_name: "Fusarium_spp"}),
          expect.objectContaining({predicted_class_name: "Penicillium_spp"}),
          expect.objectContaining({predicted_class_name: "Rhizopus_spp"}),
        ])
      );
    });
  });

  describe("patchMold", () => {
    it("should successfully update a mold", async () => {
      const moldId = "test-mold-id";
      const updateData = {name: "Updated Mold Name"};
      const updatedMold = {
        id: moldId,
        name: "Updated Mold Name",
        description: "A test mold",
        growth_stage: "Early",
        photo_url: ["http://example.com/photo.jpg"],
      };

      mockReq.params = {id: moldId};
      mockReq.body = {moldName: updateData.name};
      mockMoldService.updateMoldInFirestore.mockResolvedValue(
        updatedMold as any
      );

      await moldController.patchMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.updateMoldInFirestore).toHaveBeenCalledWith(
        moldId,
        {
          ...updateData,
          status: "draft",
        }
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        "Successfully updated mold."
      );
    });

    it("should enrich and update additional_info when patching mold info fields", async () => {
      const moldId = "test-mold-id";
      const details = {
        info: {
          description: "A test mold",
          taxonomy: {
            kingdom: "Fungi",
            phylum: "Ascomycota",
            class: "Eurotiomycetes",
            order: "Eurotiales",
            family: "Testaceae",
            genus: "Testus",
          },
          overview: "Overview text",
          health_risks: "Health risk text",
          affected_hosts: "Affected host text",
          symptoms_and_signs: "Symptom/sign text",
          disease_cycle_spread_impact: "Spread impact text",
          prevention_summary: "Prevention summary text",
          additional_info: [],
        },
        prevention: {
          physicalControl: "p",
          mechanicalControl: "m",
          culturalControl: "c",
          biologicalControl: "b",
          chemicalControl: "ch",
        },
      };

      mockReq.params = {id: moldId};
      mockReq.body = {details};

      mockMoldService.updateMoldInFirestore.mockResolvedValue({id: moldId} as any);

      await moldController.patchMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.updateMoldInFirestore).toHaveBeenCalledWith(
        moldId,
        expect.objectContaining({
          mold_details: expect.objectContaining({
            info: expect.objectContaining({
              additional_info: expect.arrayContaining([
                {title: "Overview", description: "Overview text"},
                {title: "Health Risks", description: "Health risk text"},
                {title: "Affected Hosts", description: "Affected host text"},
                {title: "Symptoms and Signs", description: "Symptom/sign text"},
                {title: "Disease Cycle / Spread / Impact", description: "Spread impact text"},
                {title: "Prevention Summary", description: "Prevention summary text"},
              ]),
            }),
          }),
        })
      );

      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        "Successfully updated mold."
      );
    });

    it("should return error when update fails", async () => {
      const moldId = "test-mold-id";
      const updateData = {name: "Updated Mold Name"};

      mockReq.params = {id: moldId};
      mockReq.body = {moldName: updateData.name};
      mockMoldService.updateMoldInFirestore.mockResolvedValue(null);

      await moldController.patchMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.updateMoldInFirestore).toHaveBeenCalledWith(
        moldId,
        {
          ...updateData,
          status: "draft",
        }
      );
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Failed to update mold",
        404
      );
    });
  });

  describe("softDeleteMold", () => {
    it("should successfully soft delete a mold", async () => {
      const moldId = "test-mold-id";

      mockReq.params = {id: moldId};
      mockMoldService.softRemoveMold.mockResolvedValue(undefined);

      await moldController.softDeleteMold(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockMoldService.softRemoveMold).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        "Successfully soft deleted mold."
      );
    });
  });

  describe("deleteMold", () => {
    it("should successfully delete a mold permanently", async () => {
      const moldId = "test-mold-id";

      mockReq.params = {id: moldId};
      mockMoldService.removeMold.mockResolvedValue(undefined);

      await moldController.deleteMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.removeMold).toHaveBeenCalledWith(moldId);
      // Audit logging handled by middleware, not checked here
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        "Successfully deleted mold"
      );
    });
  });
});
