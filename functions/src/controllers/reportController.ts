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
  /**
   * @swagger
    * /api/v1/report:
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
 *             type: object
 *             required:
 *               - reporter_id
 *               - reported_user_id
 *               - reason
 *             properties:
 *               reporter_id:
 *                 type: string
 *                 description: ID of the user creating the report
 *               reported_user_id:
 *                 type: string
 *                 description: ID of the reported user
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, inappropriate_content, other]
 *                 description: Reason for the report
 *               details:
 *                 type: string
 *                 description: Additional details about the report
 *     responses:
 *       200:
   *         description: Successfully created report
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     reporter_id:
 *                       type: string
 *                     reported_user_id:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     details:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   */
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
  /**
   * @swagger
    * /api/v1/report:
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
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: pageToken
   *         schema:
   *           type: string
   *         description: Cursor token for pagination
   *     responses:
   *       200:
   *         description: List of reports
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     snapshot:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           reporter_id:
 *                             type: string
 *                           reported_user_id:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           details:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
   *       404:
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
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
    * /api/v1/report/{id}:
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
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     reporter_id:
 *                       type: string
 *                     reported_user_id:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     details:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   *       500:
   *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
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
    * /api/v1/report/{id}:
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
 *             properties:
 *               reporter_id:
 *                 type: string
 *               reported_user_id:
 *                 type: string
 *               reason:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     reporter_id:
 *                       type: string
 *                     reported_user_id:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     details:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   *       404:
   *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   *       500:
   *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   */
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
  /**
   * @swagger
    * /api/v1/report/hard/{id}:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Successfully deleted report"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   */
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
  /**
   * @swagger
    * /api/v1/report/soft/{id}:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: "Successfully soft deleted report."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
   */
  try {
    const id: string = req.params.id;
    await softRemoveReport(id);
    return sendSuccess(res, "Successfully soft deleted report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


