import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {Report, PaginatedResult} from "../types/types";
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";
import {
  addReportToFirestore,
  retrieveAllReports,
  retrieveReportById,
  updateReportInFirestore,
  removeReport,
  softRemoveReport,
} from "../services/reportService";

export const createReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/reports:
   *   post:
   *     summary: Create a new report
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Create a new user report. Requires authentication (Bearer token or session cookie).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Report'
   *     responses:
   *       200:
   *         description: Successfully created report
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ReportResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   */
  try {
    const details: Omit<Report, "created_at"> = req.body;
    const report: Report | null = await addReportToFirestore(details as Report);
    if (!report) return sendError(res, "Failed to create report", 400);
    // Audit log
    if (req.user) {
      const {id, user: {role}} = req.user;
      const targetId = report.reported_user_id || "unknown";
      createLog(id, role, AuditAction.CORRECT_FLAG_REPORT, "Created report", targetId); // TODO: wrong audit action
    }
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllReports = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/reports:
   *   get:
   *     summary: Get all reports
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve all user reports. Requires authentication (Bearer token or session cookie).
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Page size
   *       - in: query
   *         name: pageToken
   *         schema:
   *           type: string
   *         description: Cursor token
   *     responses:
   *       200:
   *         description: List of reports
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResult'
   *       404:
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   */
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
  /**
   * @swagger
   * /api/v1/reports/{id}:
   *   get:
   *     summary: Get report by ID
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve a report by its ID. Requires authentication (Bearer token or session cookie).
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Report ID
   *     responses:
   *       200:
   *         description: Report
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
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
  /**
   * @swagger
   * /api/v1/reports/{id}:
   *   patch:
   *     summary: Update report
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Update a report by its ID. Requires authentication (Bearer token or session cookie).
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Report ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Partial Report object with fields to update
   *     responses:
   *       200:
   *         description: Successfully updated report
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    const details: Partial<Report> = req.body;
    const updated = await updateReportInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update report", 404);
    // Audit log
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.RESOLVE_REPORT, `Updated report ${id}`, id); // todo: wrong audit action
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/reports/hard/{id}:
   *   delete:
   *     summary: Hard delete report
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Hard delete a report by its ID. Requires authentication (Bearer token or session cookie).
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Report ID
   *     responses:
   *       200:
   *         description: Successfully deleted report
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await removeReport(id);
    // Audit log
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.RESOLVE_REPORT, `Hard deleted report ${id}`, id);
    }
    return sendSuccess(res, "Successfully deleted report");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/reports/soft/{id}:
   *   delete:
   *     summary: Soft delete report
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Soft delete a report by its ID. Requires authentication (Bearer token or session cookie).
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Report ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted report
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await softRemoveReport(id);
    // Audit log
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.RESOLVE_REPORT, `Soft deleted report ${id}`, id); // todo: wrong audit action
    }
    return sendSuccess(res, "Successfully soft deleted report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
