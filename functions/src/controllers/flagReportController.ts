import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {
  addFlagReportToFirestore,
  retrieveAllFlagReports,
  retrieveFlagReportById,
  updateFlagReportInFirestore,
  removeFlagReport,
  softRemoveFlagReport,
} from "../services/flagReportService";
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";
import {FlagReportBase, PaginatedResult} from "../types/types";

export const createFlagReport = async (req: Request, res: Response) => {
  try {
    const details = req.body;
    const reporterId = req.user?.id;
    if (!reporterId) return sendError(res, "Missing reporter id", 400);
    const report = await addFlagReportToFirestore({
      ...details,
      reporterId,
      status: "unresolved",
    });
    if (!report) return sendError(res, "Failed to create flag report");
    req.auditTargetId = (report as any).id || "";
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllFlagReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<FlagReportBase[]> | null =
      await retrieveAllFlagReports(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve flag reports", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getFlagReportById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const report = await retrieveFlagReportById(id);
    if (!report) return sendError(res, "Flag report not found", 404);
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchFlagReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<any> = req.body;
    const updated = await updateFlagReportInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update flag report", 404);
    if (details.status === "resolved" && req.user) {
      createLog(
        req.user.id,
        req.user.user.role,
        AuditAction.CORRECT_FLAG_REPORT,
        `Resolved flag report ${id}`,
        id
      );
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteFlagReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const ok = await removeFlagReport(id);
    if (!ok) return sendError(res, "Failed to delete flag report", 404);
    return sendSuccess(res, "Successfully deleted flag report");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteFlagReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const ok = await softRemoveFlagReport(id);
    if (!ok) return sendError(res, "Failed to soft delete flag report", 404);
    return sendSuccess(res, "Successfully soft deleted flag report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


