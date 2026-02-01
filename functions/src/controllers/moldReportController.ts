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
  searchAndFilterMoldReports,
  getMoldReportMonthlyTotals,
} from "../services/moldReportService";
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";
import {getCombinedTotalCounts, getMoldCasePriorityBreakdown} from "../services/moldCaseService";

export const createMoldReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-reports:
   *   post:
   *     summary: Create a new mold report
   *     tags: [MoldReport]
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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     case_name:
   *                       type: string
   *                     date_observed:
   *                       type: string
   *                       format: date-time
   *                     user_id:
   *                       type: string
   *                     assigned_mycologist_id:
   *                       type: string
   *                       nullable: true
   *                     host:
   *                       type: string
   *                     location:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [pending, "in progress", resolved, rejected]
   *                     case_details:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           description:
   *                             type: string
   *                           cover_photo:
   *                             type: array
   *                             items:
   *                               type: string
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    devLog("[createMoldReport] Starting report creation");
    // After parseMultipartJson, details fields are promoted to root body
    const {description, ...details} = req.body;
    const photos: Express.Multer.File[] | undefined = req.files as
      | Express.Multer.File[]
      | undefined;
    devLog(`[createMoldReport] Received ${photos?.length || 0} photos, case_name=${details.case_name}`);

    let urls: string[] | null = null;
    if (photos && photos.length > 0) {
      devLog(`[createMoldReport] Starting file upload for ${photos.length} photos`);
      const startTime = Date.now();
      const uploaded = await uploadFiles(photos, StorageFolder.MOLD_REPORTS);
      const duration = Date.now() - startTime;
      devLog(`[createMoldReport] Upload completed in ${duration}ms, result: ${uploaded?.length || 0} files`);

      if (!uploaded || uploaded.length === 0) {
        devLog("[createMoldReport] Upload failed - no files returned");
        return sendError(
          res,
          "Invalid photo, please upload a different image.",
          400
        );
      }
      urls = uploaded;
    }

    // Preserve existing case_details if provided, otherwise create new entry
    let caseDetails = details.case_details || [];
    if (!Array.isArray(caseDetails)) {
      caseDetails = [];
    }

    // If no case_details were provided, create one with the uploaded photos and description
    if (caseDetails.length === 0) {
      caseDetails = [
        {
          cover_photo: urls,
          description: description || "",
        },
      ];
    } else if (urls) {
      // If case_details exist and we have photos, update the first entry with the uploaded photos
      caseDetails[0] = {
        ...caseDetails[0],
        cover_photo: urls,
      };
    }

    devLog(`[createMoldReport] Creating firestore report with ${caseDetails.length} case details`);
    const moldReport: MoldReport | null = await addMoldReportToFirestore({
      ...details,
      assigned_mycologist_id: null,
      case_details: caseDetails,
      is_archived: false,
      status: "pending",
    } as MoldReport);

    if (!moldReport) {
      devLog("[createMoldReport] Failed to create firestore report");
      return sendError(res, "Failed to create mold report", 400);
    }
    devLog(`[createMoldReport] ✅ Report created successfully: ${moldReport.case_name}`);
    return sendSuccess(res, moldReport);
  } catch (error) {
    devLog("[createMoldReport] ❌ Error: " + error);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of reports
 *                     pending:
 *                       type: integer
 *                       description: Number of pending reports
 *                     in_progress:
 *                       type: integer
 *                       description: Number of in-progress reports
 *                     resolved:
 *                       type: integer
 *                       description: Number of resolved reports
 *                     closed:
 *                       type: integer
 *                       description: Number of closed/rejected reports
 *       500:
 *         description: Server error
 */
export const getMoldReportCountsController = async (
  req: Request,
  res: Response
) => {
  try {
    const counts = await getMoldReportStatusCounts();
    if (!counts) {
      return sendError(res, "Failed to retrieve mold report counts", 500);
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                             format: date-time
 *                           user_id:
 *                             type: string
 *                           assigned_mycologist_id:
 *                             type: string
 *                             nullable: true
 *                           host:
 *                             type: string
 *                           location:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, "in progress", resolved, rejected]
 *                           case_details:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 description:
 *                                   type: string
 *                                 cover_photo:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                           reporter:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                               updated_at:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               deleted_at:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *                       description: Token for fetching next page of results
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAllMoldReports(limit, false, pageToken);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                             format: date-time
 *                           assigned_mycologist_id:
 *                             type: string
 *                             nullable: true
 *                           host:
 *                             type: string
 *                           location:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, "in progress", resolved, rejected]
 *                           case_details:
 *                             type: array
 *                             items:
 *                               type: object
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllMoldReportsByUser = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    // Prevent caching by Authorization header - critical for user-specific data
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Vary", "Authorization");
    const result: PaginatedResult<Omit<MoldReport, "user_id">[]> | null =
      await retrieveAllMoldReportsByUser(uid, limit, false, pageToken);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                           status:
 *                             type: string
 *                           case_details:
 *                             type: array
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve mold reports
 *       500:
 *         description: Server error
 */
export const getAllArchivedMoldReports = async (
  req: Request,
  res: Response
) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAllMoldReports(limit, true, pageToken);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending]
 *                           assigned_mycologist_id:
 *                             type: string
 *                             nullable: true
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Failed to retrieve unassigned mold reports
 *       500:
 *         description: Server error
 */
export const getUnassignedMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveUnassignedMoldReports(limit, pageToken);
    if (!result) {
      return sendError(res, "Failed to retrieve unassigned mold reports", 404);
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     case_name:
 *                       type: string
 *                     date_observed:
 *                       type: string
 *                       format: date
 *                     user_id:
 *                       type: string
 *                     assigned_mycologist_id:
 *                       type: string
 *                       nullable: true
 *                     host:
 *                       type: string
 *                     location:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in progress, resolved, rejected, closed]
 *                     case_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cover_photo:
 *                             type: array
 *                             items:
 *                               type: string
 *                           description:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
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
      const appended = await addCaseDetailToReport(
        id,
        details as MoldReportDetails
      );
      if (!appended) {
        return sendError(res, "Failed to add case detail to report", 400);
      }
      const updated = await updateMoldReportInFirestore(id, {
        status: "pending",
      });
      // Audit log
      if (actor) {
        const {
          id: actorId,
          user: {role},
        } = actor;
        createLog(
          actorId,
          role,
          AuditAction.RESOLVE_REPORT,
          `User follow-up on report ${id}`,
          id
        );
      }
      return sendSuccess(res, updated);
    }

    // Otherwise (curator/mycologist/admin), just append the case detail
    const appended = await addCaseDetailToReport(
      id,
      details as MoldReportDetails
    );
    if (!appended) {
      return sendError(res, "Failed to add case detail to report", 400);
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     case_name:
 *                       type: string
 *                     date_observed:
 *                       type: string
 *                       format: date
 *                     user_id:
 *                       type: string
 *                     assigned_mycologist_id:
 *                       type: string
 *                     host:
 *                       type: string
 *                     location:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in progress, resolved, rejected, closed]
 *                     case_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Failed to assign mycologist
 *       500:
 *         description: Server error
 */
export const assignReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: { assigned_mycologist_id: string; status?: string } =
      req.body;
    const updated = await updateMoldReportInFirestore(id, {
      assigned_mycologist_id: details.assigned_mycologist_id,
      // Cast here because DTO allows arbitrary string; repo enforces allowed statuses
      status: (details.status as any) || "in progress",
    });
    if (!updated) return sendError(res, "Failed to assign mycologist", 400);
    if (req.user) {
      const {
        id: actorId,
        user: {role},
      } = req.user;
      createLog(
        actorId,
        role,
        AuditAction.APPROVE_CURATOR,
        `Assigned mycologist ${details.assigned_mycologist_id} to report ${id}`,
        id
      );
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     case_name:
 *                       type: string
 *                     date_observed:
 *                       type: string
 *                       format: date
 *                     user_id:
 *                       type: string
 *                     assigned_mycologist_id:
 *                       type: string
 *                       nullable: true
 *                     host:
 *                       type: string
 *                     location:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [rejected]
 *                     case_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
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
      const {
        id: actorId,
        user: {role},
      } = req.user;
      createLog(
        actorId,
        role,
        AuditAction.REJECT_CURATOR,
        `Rejected/closed report ${id}`,
        id
      );
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                             format: date
 *                           user_id:
 *                             type: string
 *                           assigned_mycologist_id:
 *                             type: string
 *                           host:
 *                             type: string
 *                           location:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [in progress, resolved]
 *                           case_details:
 *                             type: array
 *                             items:
 *                               type: object
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Failed to retrieve assigned mold reports
 *       500:
 *         description: Server error
 */
export const getAssignedMoldReports = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAssignedMoldReports(uid, limit, pageToken);
    if (!result) {
      return sendError(res, "Failed to retrieve assigned mold reports", 404);
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *       400:
 *         description: Missing mycologist id
 *       500:
 *         description: Failed to retrieve count
 */
export const getAssignedReportsCountController = async (
  req: Request,
  res: Response
) => {
  try {
    // Admin-only endpoint: expects query param `id` specifying mycologist UID
    const mycologistId = (req.query.id as string) || undefined;
    if (!mycologistId) {
      return sendError(res, "Missing mycologist id (query param 'id')", 400);
    }
    const count = await getAssignedReportsCount(mycologistId);
    if (count === null) return sendError(res, "Failed to retrieve count", 500);
    return sendSuccess(res, {total: count});
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     case_name:
 *                       type: string
 *                     date_observed:
 *                       type: string
 *                       format: date
 *                     user_id:
 *                       type: string
 *                     assigned_mycologist_id:
 *                       type: string
 *                       nullable: true
 *                     host:
 *                       type: string
 *                     location:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in progress, resolved, rejected, closed]
 *                     case_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cover_photo:
 *                             type: array
 *                             items:
 *                               type: string
 *                           description:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     case_name:
 *                       type: string
 *                     date_observed:
 *                       type: string
 *                       format: date
 *                     user_id:
 *                       type: string
 *                     assigned_mycologist_id:
 *                       type: string
 *                       nullable: true
 *                     host:
 *                       type: string
 *                     location:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, in progress, resolved, rejected, closed]
 *                     case_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
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

/**
 * @swagger
 * /api/v1/mold-report/search:
 *   get:
 *     summary: Search and filter mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: |
 *       Search and filter mold reports by multiple criteria. All parameters are optional.
 *       Requires authentication. Admin users see all reports, regular users see only their own.
 *       When priority is specified, it filters reports that have associated mold cases with that priority.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for case name, host, location, reporter name, or status (ignored when priority is set)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, "in progress", resolved, rejected]
 *         description: Filter by report status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by mold case priority (searches mold_cases collection)
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
 *         description: Filtered and searched mold report list
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
 *                           case_name:
 *                             type: string
 *                           date_observed:
 *                             type: string
 *                             format: date-time
 *                           host:
 *                             type: string
 *                           location:
 *                             type: string
 *                           status:
 *                             type: string
 *                           reporter:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           mold_case:
 *                             type: object
 *                             properties:
 *                               priority:
 *                                 type: string
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Failed to retrieve mold reports
 */
export const searchMoldReports = async (req: Request, res: Response) => {
  try {
    const searchQuery: string | undefined = req.query.search as
      | string
      | undefined;
    const status: string | undefined = req.query.status as string | undefined;
    const priority: string | undefined = req.query.priority as
      | string
      | undefined;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as
      | string
      | undefined;

    const result: PaginatedResult<MoldReport[]> | null =
      await searchAndFilterMoldReports(
        searchQuery,
        status,
        priority,
        limit,
        pageToken
      );

    if (!result) return sendError(res, "Failed to retrieve mold reports", 500);

    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldReportMonthlyTotalsController = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-report/counts/monthly:
   *   get:
   *     summary: Get monthly mold report totals for a year
   *     tags: [MoldReport]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve mold report counts for all 12 months of a given year (defaults to current year). Requires authentication.
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Year to retrieve (defaults to current year)
   *     responses:
   *       200:
   *         description: Monthly totals retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       month:
   *                         type: string
   *                         example: "January 2025"
   *                       total:
   *                         type: integer
   *                         example: 15
   *       400:
   *         description: Invalid year parameter
   *       401:
   *         description: Not authenticated
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
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    if (year && (isNaN(year) || year < 1900 || year > 2100)) {
      return sendError(res, "Invalid year parameter", 400);
    }

    const monthlyTotals = await getMoldReportMonthlyTotals(year);
    if (!monthlyTotals) {
      return sendError(res, "Failed to retrieve monthly totals", 500);
    }

    return sendSuccess(res, monthlyTotals);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/dashboard/counts/totals:
 *   get:
 *     summary: Get combined total counts for dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: |
 *       Retrieve combined total counts including:
 *       - User counts by role (farmer, mycologist, curator, admin)
 *       - User active/inactive status counts
 *       - Mold report status counts (total, pending, in_progress, resolved, closed)
 *       - Mold case priority breakdown (low, medium, high)
 *       Results are cached for 1 hour.
 *     responses:
 *       200:
 *         description: Combined counts retrieved successfully
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
 *                     users:
 *                       type: object
 *                       example: {"farmer": 10, "mycologist": 5, "curator": 3, "admin": 1}
 *                       description: User counts grouped by role
 *                     userStatus:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: integer
 *                           example: 15
 *                         inactive:
 *                           type: integer
 *                           example: 4
 *                       description: Active and inactive user counts
 *                     moldReports:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         pending:
 *                           type: integer
 *                           example: 10
 *                         in_progress:
 *                           type: integer
 *                           example: 20
 *                         resolved:
 *                           type: integer
 *                           example: 15
 *                         closed:
 *                           type: integer
 *                           example: 5
 *                       description: Mold report counts by status
 *                     moldCases:
 *                       type: object
 *                       properties:
 *                         low:
 *                           type: integer
 *                           example: 25
 *                         medium:
 *                           type: integer
 *                           example: 18
 *                         high:
 *                           type: integer
 *                           example: 7
 *                       description: Mold case counts by priority
 *       401:
 *         description: Not authenticated
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
export const getCombinedTotalCountsController = async (req: Request, res: Response) => {
  try {
    const counts = await getCombinedTotalCounts();
    if (!counts) {
      return sendError(res, "Failed to retrieve combined counts", 500);
    }

    return sendSuccess(res, counts);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/counts/priorities:
 *   get:
 *     summary: Get mold case priority breakdown counts
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: |
 *       Retrieve mold case counts broken down by priority level:
 *       - low: Low priority cases
 *       - medium: Medium priority cases
 *       - high: High priority cases
 *       Results are cached for 1 hour.
 *     responses:
 *       200:
 *         description: Priority breakdown retrieved successfully
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
 *                     low:
 *                       type: integer
 *                       example: 25
 *                       description: Count of low priority cases
 *                     medium:
 *                       type: integer
 *                       example: 18
 *                       description: Count of medium priority cases
 *                     high:
 *                       type: integer
 *                       example: 7
 *                       description: Count of high priority cases
 *       401:
 *         description: Not authenticated
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
export const getMoldCasePriorityBreakdownController = async (req: Request, res: Response) => {
  try {
    const breakdown = await getMoldCasePriorityBreakdown();
    if (!breakdown) {
      return sendError(res, "Failed to retrieve priority breakdown", 500);
    }

    return sendSuccess(res, breakdown);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
