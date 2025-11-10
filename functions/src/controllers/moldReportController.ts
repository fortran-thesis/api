import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldReport, MoldReportDetails, PaginatedResult} from "../types/types";
import {uploadFiles} from "../lib/storage";
import {StorageFolder} from "../configs/storage";
import {
  addMoldReportToFirestore,
  retrieveAllMoldReportsByUser,
  retrieveUnassignedMoldReports,
  retrieveAssignedMoldReports,
  retrieveMoldReportById,
  updateMoldReportInFirestore,
  removeMoldReport,
  softRemoveMoldReport,
  addCaseDetailToReport,
  getMoldReportStatusCounts,
  retrieveAllMoldReports,
  getAssignedReportsCount,
} from "../services/moldReportService";
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";

export const createMoldReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-reports:
   *   post:
   *     summary: Create a new mold report
   *     tags: [MoldReports]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Create a new mold report. Requires authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               details:
   *                 type: object
   *                 properties:
   *                   date_observed:
   *                     type: string
   *                     format: date-time
   *                   case_name:
   *                     type: string
   *                   user_id:
   *                     type: string
   *                   host:
   *                     type: string
   *                   case_details:
   *                     type: array
   *                     items:
   *                       type: object
   *                       properties:
   *                         cover_photo:
   *                           type: array
   *                           items:
   *                             type: string
   *                         description:
   *                           type: string
   *                   description:
   *                     type: string
   *                   assigned_mycologist_id:
   *                     type: string
   *                   status:
   *                     type: string
   *                   is_archived:
   *                     type: boolean
   *                 description: MoldReport DTO (location omitted)
   *               cover_photo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successfully created mold report
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    // After parseMultipartJson, details fields are promoted to root body
    const {description, ...details} = req.body;
    const photos: Express.Multer.File[] | undefined = req.files as Express.Multer.File[] | undefined;
    let urls: string[] | null = null;
    if (photos) {
      const uploaded = await uploadFiles(
        photos,
        StorageFolder.MOLD_REPORTS
      );
      if (!uploaded) return sendError(res, "Invalid photo, please upload a different image.", 400);
      urls = uploaded;
    }
    const moldReport: MoldReport | null = await addMoldReportToFirestore({
      ...details,
      assigned_mycologist_id: null,
      case_details: [{
        cover_photo: urls,
        description: description
      }],
      is_archived: false,
      status: "pending"
    } as MoldReport);
    if (!moldReport) return sendError(res, "Failed to create mold report", 400);
    return sendSuccess(res, moldReport);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/counts/statuses:
 *   get:
 *     summary: Get mold report status counts
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve counts of mold reports by status (pending, in progress, resolved, rejected). Requires admin role.
 *     responses:
 *       200:
 *         description: Status counts retrieved successfully
 *       500:
 *         description: Server error
 */
export const getMoldReportCountsController = async (req: Request, res: Response) => {
  try {
    const counts = await getMoldReportStatusCounts();
    if (!counts) return sendError(res, "Failed to retrieve mold report counts", 500);
    return sendSuccess(res, counts);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report:
 *   get:
 *     summary: Get all mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all mold reports with pagination. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of mold reports
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<MoldReport[]> | null = await retrieveAllMoldReports(limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/user:
 *   get:
 *     summary: Get all mold reports by authenticated user
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all mold reports created by the authenticated user with pagination. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of user's mold reports
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllMoldReportsByUser = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    // Prevent caching by Authorization header - critical for user-specific data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization');
    const result: PaginatedResult<Omit<MoldReport, "user_id">[]> | null = await retrieveAllMoldReportsByUser(uid, limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/archive:
 *   get:
 *     summary: Get all archived mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all archived mold reports with pagination. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of archived mold reports
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllArchivedMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldReport[]> | null = await retrieveAllMoldReports(limit, true, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/unassigned:
 *   get:
 *     summary: Get unassigned mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all mold reports that have not been assigned to a mycologist. Requires admin role.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of unassigned mold reports
 *       404:
 *         description: Failed to retrieve unassigned mold reports
 *       500:
 *         description: Server error
 */
export const getUnassignedMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<MoldReport[]> | null = await retrieveUnassignedMoldReports(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve unassigned mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/{id}/case-details:
 *   post:
 *     summary: Add case detail to a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Add a case detail (follow-up) to an existing mold report. If the requester is the report owner, the report status resets to pending and the mycologist is unassigned. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               cover_photo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of photo URLs (optional)
 *               description:
 *                 type: string
 *                 description: Case detail description
 *     responses:
 *       200:
 *         description: Case detail added successfully
 *       400:
 *         description: Failed to add case detail
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
export const postCaseDetail = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details = req.body as { cover_photo?: string[]; description: string };
    // Fetch report to determine actor and ownership
    const report = await retrieveMoldReportById(id);
    if (!report) return sendError(res, "Report not found", 404);

    const actor = req.user;

    // If the requester is the report owner, treat this as a user follow-up:
    // append the case detail, reset status to 'pending', and unassign the mycologist.
    if (actor && actor.id === report.user_id) {
      const appended = await addCaseDetailToReport(id, details as MoldReportDetails);
      if (!appended) return sendError(res, "Failed to add case detail to report", 400);
      const updated = await updateMoldReportInFirestore(id, {
        status: "pending",
        assigned_mycologist_id: null,
      });
      // Audit log
      if (actor) {
        const {id: actorId, user: {role}} = actor;
        createLog(actorId, role, AuditAction.RESOLVE_REPORT, `User follow-up on report ${id}`, id);
      }
      return sendSuccess(res, updated);
    }

    // Otherwise (curator/mycologist/admin), just append the case detail
    const appended = await addCaseDetailToReport(id, details as MoldReportDetails);
    if (!appended) return sendError(res, "Failed to add case detail to report", 400);
    return sendSuccess(res, appended);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/{id}/assign:
 *   patch:
 *     summary: Assign a mycologist to a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Assign a mycologist to a mold report and optionally update its status. Requires admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigned_mycologist_id
 *             properties:
 *               assigned_mycologist_id:
 *                 type: string
 *                 description: ID of the mycologist to assign
 *               status:
 *                 type: string
 *                 description: Optional status update (defaults to "in progress")
 *     responses:
 *       200:
 *         description: Mycologist assigned successfully
 *       400:
 *         description: Failed to assign mycologist
 *       500:
 *         description: Server error
 */
export const assignReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: { assigned_mycologist_id: string; status?: string } = req.body;
    const updated = await updateMoldReportInFirestore(id, {
      assigned_mycologist_id: details.assigned_mycologist_id,
      // Cast here because DTO allows arbitrary string; repo enforces allowed statuses
      status: (details.status as any) || "in progress",
    });
    if (!updated) return sendError(res, "Failed to assign mycologist", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.APPROVE_CURATOR, `Assigned mycologist ${details.assigned_mycologist_id} to report ${id}`, id);
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/{id}/reject:
 *   patch:
 *     summary: Reject/close a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Mark a mold report as rejected and clear assigned mycologist. Requires admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Report rejected successfully
 *       400:
 *         description: Failed to reject/close report
 *       500:
 *         description: Server error
 */
export const rejectReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    // Mark as closed and clear assigned mycologist
    const updated = await updateMoldReportInFirestore(id, {
      status: "rejected",
      assigned_mycologist_id: null,
    });
    if (!updated) return sendError(res, "Failed to reject/close report", 400);
    if (req.user) {
      const {id: actorId, user: {role}} = req.user;
      createLog(actorId, role, AuditAction.REJECT_CURATOR, `Rejected/closed report ${id}`, id);
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/assigned:
 *   get:
 *     summary: Get mold reports assigned to authenticated mycologist
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all mold reports assigned to the authenticated mycologist. Requires curator role.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Cursor token for pagination
 *     responses:
 *       200:
 *         description: List of assigned mold reports
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve assigned mold reports
 *       500:
 *         description: Server error
 */
export const getAssignedMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldReport[]> | null = await retrieveAssignedMoldReports(uid, limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve assigned mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/assigned/count:
 *   get:
 *     summary: Get count of reports assigned to a specific mycologist
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve the count of mold reports assigned to a specific mycologist by ID. Requires admin role.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mycologist user ID
 *     responses:
 *       200:
 *         description: Count retrieved successfully
 *       400:
 *         description: Missing mycologist id
 *       500:
 *         description: Failed to retrieve count
 */
export const getAssignedReportsCountController = async (req: Request, res: Response) => {
  try {
    // Admin-only endpoint: expects query param `id` specifying mycologist UID
    const mycologistId = (req.query.id as string) || undefined;
    if (!mycologistId) return sendError(res, "Missing mycologist id (query param 'id')", 400);
    const count = await getAssignedReportsCount(mycologistId);
    if (count === null) return sendError(res, "Failed to retrieve count", 500);
    return sendSuccess(res, { total: count });
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/{id}:
 *   get:
 *     summary: Get a mold report by ID
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold report by its ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Mold report retrieved successfully
 *       404:
 *         description: Failed to retrieve mold report
 *       500:
 *         description: Server error
 */
export const getMoldReportById = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const report: MoldReport | null = await retrieveMoldReportById(id);
    if (!report) return sendError(res, "Failed to retrieve mold report", 404);
    return sendSuccess(res, report);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/{id}:
 *   patch:
 *     summary: Update a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update a mold report's details by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial mold report data to update
 *     responses:
 *       200:
 *         description: Mold report updated successfully
 *       404:
 *         description: Failed to update mold report
 *       500:
 *         description: Server error
 */
export const patchMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<MoldReport> = req.body;
    const updated = await updateMoldReportInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold report", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/hard/{id}:
 *   delete:
 *     summary: Hard delete a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Permanently delete a mold report by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Mold report deleted successfully
 *       500:
 *         description: Server error
 */
export const deleteMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMoldReport(id);
    return sendSuccess(res, "Successfully deleted mold report");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/soft/{id}:
 *   delete:
 *     summary: Soft delete a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Soft delete a mold report by marking it as archived. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Mold report soft deleted successfully
 *       500:
 *         description: Server error
 */
export const softDeleteMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMoldReport(id);
    return sendSuccess(res, "Successfully soft deleted mold report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
