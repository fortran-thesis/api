import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {Report, PaginatedResult} from "../types/types";
import {
  addReportToFirestore,
  retrieveAllReports,
  retrieveReportById,
  updateReportInFirestore,
  removeReport,
  softRemoveReport,
} from "../services/reportService";

export const createReport = async (req: Request, res: Response) => {
  try {
    const details: Omit<Report, "created_at"> = req.body;
    const report: Report | null = await addReportToFirestore(details as Report);
    if (!report) return sendError(res, "Failed to create report", 400);
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<Report[]> | null = await retrieveAllReports(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const report: Report | null = await retrieveReportById(id);
    if (!report) return sendError(res, "Failed to retrieve report", 404);
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<Report> = req.body;
    const updated = await updateReportInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update report", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeReport(id);
    return sendSuccess(res, "Successfully deleted report");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveReport(id);
    return sendSuccess(res, "Successfully soft deleted report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


