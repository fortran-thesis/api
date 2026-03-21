import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as moldReportController from "../../src/controllers/moldReportController";
import * as moldReportService from "../../src/services/moldReportService";
import * as responseUtils from "../../src/utils/response";

jest.mock("../../src/services/moldReportService");
jest.mock("../../src/services/moldCaseService", () => ({
  getCombinedTotalCounts: jest.fn(),
  getMoldCasePriorityBreakdown: jest.fn(),
  addMoldCaseToFirestore: jest.fn(),
  retrieveMoldCaseByReportId: jest.fn(),
}));
jest.mock("../../src/services/lookupService");
jest.mock("../../src/utils/logging");
jest.mock("../../src/utils/response");
jest.mock("../../src/utils/dev");
jest.mock("../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldReportService = moldReportService as jest.Mocked<typeof moldReportService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;

describe("moldReportController transitions (unit)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {id: "report-1"},
      body: {},
      query: {},
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

  it("blocks assign when report is not in pending status", async () => {
    mockReq.body = {assigned_mycologist_id: "myc-1"};
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "resolved",
      assigned_mycologist_id: null,
    } as any);

    await moldReportController.assignReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Cannot assign report with status 'resolved'",
      409
    );
  });

  it("blocks reject when report status cannot transition to rejected", async () => {
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "rejected",
    } as any);

    await moldReportController.rejectReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Cannot reject report with status 'rejected'",
      409
    );
  });

  it("blocks direct patch for rejected transition", async () => {
    mockReq.body = {status: "rejected"};
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "in progress",
    } as any);

    await moldReportController.patchMoldReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Use /:id/assign or /:id/reject for this transition",
      400
    );
  });

  it("blocks invalid patch transition resolved to in progress", async () => {
    mockReq.body = {status: "in progress"};
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "resolved",
    } as any);

    await moldReportController.patchMoldReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Invalid status transition from 'resolved' to 'in progress'",
      409
    );
  });

  it("blocks in progress transition via patch (requires /assign endpoint)", async () => {
    mockReq.body = {status: "in progress"};
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "pending",
    } as any);

    await moldReportController.patchMoldReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Use /:id/assign or /:id/reject for this transition",
      400
    );
  });

  it("blocks soft delete when report status is already rejected", async () => {
    mockMoldReportService.retrieveMoldReportById.mockResolvedValue({
      id: "report-1",
      status: "rejected",
    } as any);

    await moldReportController.softDeleteMoldReport(mockReq as Request, mockRes as Response);

    expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
      mockRes,
      "Cannot close report with status 'rejected'",
      409
    );
  });
});
