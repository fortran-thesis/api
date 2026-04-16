import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as moldCaseController from "../../src/controllers/moldCaseController";
import * as moldCaseService from "../../src/services/moldCaseService";
import * as moldReportService from "../../src/services/moldReportService";
import * as moldipediaService from "../../src/services/moldipediaService";
import * as responseUtils from "../../src/utils/response";

jest.mock("../../src/services/moldCaseService");
jest.mock("../../src/services/moldReportService");
jest.mock("../../src/services/moldipediaService", () => ({
  retrieveAllMoldipedia: jest.fn(),
}));
jest.mock("../../src/services/lookupService");
jest.mock("../../src/utils/response");
jest.mock("../../src/utils/dev");

const mockMoldCaseService = moldCaseService as jest.Mocked<typeof moldCaseService>;
const mockMoldReportService = moldReportService as jest.Mocked<typeof moldReportService>;
const mockMoldipediaService = moldipediaService as jest.Mocked<typeof moldipediaService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;

describe("moldCaseController.finalizeVerdict", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {id: "case-1"},
      body: {
        moldName: "Aspergillus niger",
        confidence: 98,
      },
      user: {
        id: "admin-1",
        user: {
          role: "admin",
        },
      } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockResponseUtils.sendSuccess.mockReturnValue(undefined as any);
    mockResponseUtils.sendError.mockReturnValue(undefined as any);
    mockResponseUtils.defaultError.mockReturnValue(undefined as any);
  });

  it("keeps the mold case active and resolves the linked report", async () => {
    mockMoldCaseService.retrieveMoldCaseById.mockResolvedValue({
      id: "case-1",
      name: "Corn Leaf Spot",
      user_id: "farmer-1",
      mycologist_id: "myco-1",
      mold_report_id: "report-1",
      is_archived: false,
      end_date: null,
    } as any);

    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "pending",
    } as any);

    mockMoldCaseService.updateMoldCaseInFirestore.mockResolvedValue({
      id: "case-1",
      name: "Corn Leaf Spot",
      user_id: "farmer-1",
      mycologist_id: "myco-1",
      mold_report_id: "report-1",
      is_archived: false,
      end_date: null,
    } as any);

    mockMoldReportService.updateMoldReportInFirestore.mockResolvedValue({
      id: "report-1",
      status: "resolved",
    } as any);

    mockMoldipediaService.retrieveAllMoldipedia.mockResolvedValue({
      snapshot: [],
      nextPageToken: null,
    } as any);

    await moldCaseController.finalizeVerdict(mockReq as Request, mockRes as Response);

    expect(mockMoldCaseService.updateMoldCaseInFirestore).toHaveBeenCalledWith(
      "case-1",
      expect.objectContaining({
        final_verdict: expect.objectContaining({
          moldName: "Aspergillus niger",
          confidence: 98,
        }),
        is_archived: false,
      })
    );

    expect(mockMoldReportService.updateMoldReportInFirestore).toHaveBeenCalledWith(
      "report-1",
      {status: "resolved"}
    );
    expect(mockResponseUtils.sendSuccess).toHaveBeenCalled();
  });
});
