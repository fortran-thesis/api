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
  /**
   * @swagger
   * /api/v1/flag-reports:
   *   post:
   *     summary: Create a flag report (content)
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Flag content as incorrect or inappropriate. Requires authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content_id:
   *                 type: string
   *                 description: ID of the content being flagged
   *               content_type:
   *                 type: string
   *                 description: Type of content (e.g., "mold", "moldipedia")
   *               reason:
   *                 type: string
   *                 description: Reason for flagging
   *               details:
   *                 type: string
   *                 description: Additional details
   *     responses:
   *       200:
   *         description: Successfully created flag report
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
   *                     content_id:
   *                       type: string
   *                     content_type:
   *                       type: string
   *                     reporter_id:
   *                       type: string
   *                     reason:
   *                       type: string
   *                     details:
   *                       type: string
   *                       nullable: true
   *                     status:
   *                       type: string
   *                       enum: [unresolved, resolved]
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
  /**
   * @swagger
   * /api/v1/flag-reports:
   *   get:
   *     summary: List flag reports
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: List all flag reports, paginated.
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
   *         description: List of flag reports
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
   *                           content_id:
   *                             type: string
   *                           content_type:
   *                             type: string
   *                           reporter_id:
   *                             type: string
   *                           reason:
   *                             type: string
   *                           details:
   *                             type: string
   *                             nullable: true
   *                           status:
   *                             type: string
   *                             enum: [unresolved, resolved]
   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
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
  /**
   * @swagger
   * /api/v1/flag-reports/{id}:
   *   get:
   *     summary: Get flag report by ID
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve a flag report by its ID. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Flag report ID
   *     responses:
   *       200:
   *         description: Flag report
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
   *                     content_id:
   *                       type: string
   *                     content_type:
   *                       type: string
   *                     reporter_id:
   *                       type: string
   *                     reason:
   *                       type: string
   *                     details:
   *                       type: string
   *                       nullable: true
   *                     status:
   *                       type: string
   *                       enum: [unresolved, resolved]
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
    const report = await retrieveFlagReportById(id);
    if (!report) return sendError(res, "Flag report not found", 404);
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchFlagReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/flag-reports/{id}:
   *   patch:
   *     summary: Update flag report
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Update a flag report by its ID. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Flag report ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [unresolved, resolved]
   *                 description: New status
   *               details:
   *                 type: string
   *                 description: Optional details
   *     responses:
   *       200:
   *         description: Successfully updated flag report
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: boolean
   *                   description: Update success status
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
  /**
   * @swagger
   * /api/v1/flag-reports/{id}:
   *   delete:
   *     summary: Hard delete flag report
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Hard delete a flag report by its ID. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Flag report ID
   *     responses:
   *       200:
   *         description: Successfully deleted flag report
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
   *                   example: "Successfully deleted flag report"
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
    const ok = await removeFlagReport(id);
    if (!ok) return sendError(res, "Failed to delete flag report", 404);
    return sendSuccess(res, "Successfully deleted flag report");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteFlagReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/flag-reports/soft/{id}:
   *   delete:
   *     summary: Soft delete flag report
   *     tags: [FlagReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Soft delete a flag report by its ID. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Flag report ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted flag report
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
   *                   example: "Successfully soft deleted flag report."
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
    const ok = await softRemoveFlagReport(id);
    if (!ok) return sendError(res, "Failed to soft delete flag report", 404);
    return sendSuccess(res, "Successfully soft deleted flag report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


