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
  updateCaseDetailInReport,
  getMoldReportStatusCounts,
  retrieveAllMoldReports,
  getAssignedReportsCount,
  searchAndFilterMoldReports,
  getMoldReportMonthlyTotals,
} from "../services/moldReportService";
import {performMoldLookup} from "../services/lookupService";
import {createLog} from "../utils/logging";
import {AuditAction, Role} from "../types/enums";
import {getCombinedTotalCounts, getMoldCasePriorityBreakdown, addMoldCaseToFirestore, retrieveMoldCaseByReportId} from "../services/moldCaseService";
import {Timestamp} from "firebase-admin/firestore";

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
   *                 description: MoldReport DTO
   *               cover_photo:
   *                 type: string
   *                 format: binary
   *             required:
   *               - details
   *           details:
   *             description: |
   *               JSON object containing:
   *               - case_name (required): string
   *               - host (required): string
   *               - location (required): string - City/Province location
   *               - date_observed (required): ISO 8601 date-time string
   *               - description (required): string - Problem description
   *               - user_id (optional): string
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
   *         description: Validation error - Missing or invalid required fields (case_name, host, location, date_observed, description)
   *       500:
   *         description: Server error
   */
  try {
    devLog("[createMoldReport] Starting report creation");
    // After parseMultipartJson, details fields are promoted to root body
    devLog("[createMoldReport] Raw req.body keys:", Object.keys(req.body || {}).join(", "));

    const {description, ...details} = req.body;
    const photos: Express.Multer.File[] | undefined = req.files as
      | Express.Multer.File[]
      | undefined;

    // ✅ FIX: Extract user_id from authenticated user, not from request body
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized - no user ID found", 401);
    }

    devLog("[createMoldReport] After destructure - details.location:", details.location);
    devLog("[createMoldReport] Extracted user_id from auth:", userId);
    devLog(`[createMoldReport] Received ${photos?.length || 0} photos, case_name=${details.case_name}`);

    // Validate required fields
    if (!details.case_name || !details.case_name.trim()) {
      return sendError(res, "case_name is required", 400);
    }
    if (!details.host || !details.host.trim()) {
      return sendError(res, "host (crop name) is required", 400);
    }
    if (!details.location || !details.location.trim()) {
      return sendError(res, "location is required", 400);
    }
    if (!details.date_observed) {
      return sendError(res, "date_observed is required", 400);
    }
    if (!description || !description.trim()) {
      return sendError(res, "description is required", 400);
    }

    // Create report with placeholder URLs first (returns immediately)
    const urls: string[] | null = null;
    let caseDetails = details.case_details || [];
    if (!Array.isArray(caseDetails)) {
      caseDetails = [];
    }

    // If no case_details were provided, create one with the uploaded photos and description
    if (caseDetails.length === 0) {
      caseDetails = [
        {
          cover_photo: urls || [],
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
      user_id: userId,
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

   // Run lookup in background if reported symptoms/signs/characteristics are provided
    const reportedSymptoms = req.body.reported_symptoms || [];
    const reportedSigns = req.body.reported_signs || [];
    const reportedCharacteristics = req.body.reported_characteristics || [];

    devLog(`[createMoldReport] Extracted reported fields - symptoms: ${reportedSymptoms.length}, signs: ${reportedSigns.length}, characteristics: ${reportedCharacteristics.length}`);

    // IMPORTANT: Synchronously save reported fields to document
    // This allows the fields to be persisted immediately
    if (reportedSymptoms.length > 0 || reportedSigns.length > 0 || reportedCharacteristics.length > 0) {
      const reportId = (moldReport as any).id;
      if (reportId) {
        // Synchronously save reported fields first
        await updateMoldReportInFirestore(reportId, {
          reported_symptoms: reportedSymptoms,
          reported_signs: reportedSigns,
          reported_characteristics: reportedCharacteristics,
        });
        devLog(`[createMoldReport] ✅ Synchronously saved reported fields`);

        // NOW run the async lookup task (don't await)
        (async () => {
          try {
            const lookupResults = await performMoldLookup(reportedSymptoms, reportedSigns, reportedCharacteristics);
            devLog(`[createMoldReport] Lookup completed with ${lookupResults.length} results`);
            
            await updateMoldReportInFirestore(reportId, {
              lookup_results: lookupResults.map((r) => ({
                ...r,
                timestamp: Timestamp.now(),
              })),
            });
            devLog(`[createMoldReport] ✅ Updated report with ${lookupResults.length} lookup results`);
          } catch (err) {
            devLog(`[createMoldReport] ❌ Background lookup task failed: ${err}`, "LOOKUP_BG_ERROR");
          }
        })().catch((err) => {
          devLog(`[createMoldReport] Unhandled exception in async task: ${err}`, "ASYNC_TASK_ERROR");
        });
      }
    }

    // Upload photos in background (don't wait for it)
    if (photos && photos.length > 0 && moldReport) {
      devLog(`[createMoldReport] Starting async file upload in background for ${photos.length} photos`);
      const reportId = (moldReport as any)._id || (moldReport as any).id || Object.keys(moldReport)[0];
      const caseDetailIds = (moldReport as any)._caseDetailIds || [];

      uploadFiles(photos, StorageFolder.MOLD_REPORTS)
        .then(async (uploaded) => {
          devLog(`[createMoldReport] ✅ Async upload completed: ${uploaded?.length || 0} files`);

          // Update the first case detail document in the subcollection with photo URLs
          if (uploaded && uploaded.length > 0 && reportId && caseDetailIds.length > 0) {
            try {
              const firstDetailId = caseDetailIds[0];
              await updateCaseDetailInReport(reportId, firstDetailId, {
                cover_photo: uploaded,
              });
              devLog("[createMoldReport] ✅ Updated case detail with photo URLs");
            } catch (err) {
              devLog(`[createMoldReport] ⚠️ Failed to update case detail with photos: ${err}`);
            }
          }
        })
        .catch((err) => {
          devLog(`[createMoldReport] ❌ Async upload failed: ${err}`);
        });
    }

    req.auditTargetId = (moldReport as any).id || "";
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
 *     description: Retrieve counts of mold reports by status (pending, in progress, resolved, rejected). Admins see all reports, farmers and mycologists see only their own.
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
    // If user is admin, show all counts. Otherwise, filter by userId
    const userId = req.user?.user.role === "admin" ? undefined : req.user?.id;

    const counts = await getMoldReportStatusCounts(userId);
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
 * /api/v1/mold-report/public/resolved-count:
 *   get:
 *     summary: Get count of resolved mold reports
 *     tags: [MoldReport]
 *     description: Retrieve the count of all resolved mold reports. Public endpoint - no authentication required.
 *     responses:
 *       200:
 *         description: Resolved count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resolved_count:
 *                       type: integer
 *                       description: Number of resolved mold reports
 *       500:
 *         description: Server error
 */
export const getResolvedMoldReportsCountController = async (
  req: Request,
  res: Response
) => {
  try {
    const counts = await getMoldReportStatusCounts();
    if (!counts) {
      return sendError(res, "Failed to retrieve resolved mold report count", 500);
    }
    return sendSuccess(res, {
      resolved_count: counts.resolved,
    });
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
    // Include all reports (open, closed, and rejected)
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAllMoldReports(limit, false, pageToken); // false = include all (backward compat)
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
 * /api/v1/mold-reports/user/closed:
 *   get:
 *     summary: Get authenticated user's closed mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve closed (archived/rejected) mold reports for the authenticated user with pagination. Requires authentication.
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
 *         description: List of user's closed mold reports
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
 *                             enum: [closed, rejected]
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
export const getClosedMoldReportsByUser = async (req: Request, res: Response) => {
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
      await retrieveAllMoldReportsByUser(uid, limit, true, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/closed:
 *   get:
 *     summary: Get all closed mold reports
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all closed mold reports (including rejected) with pagination. Requires authentication.
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
 *         description: List of closed mold reports
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
export const getAllClosedMoldReports = async (
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

// Backward-compatible alias for legacy route handlers/imports
export const getAllArchivedMoldReports = getAllClosedMoldReports;

/**
 * @swagger
 * /api/v1/mold-reports/aggregate/closed:
 *   get:
 *     summary: Get aggregated closed mold reports (future implementation)
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all closed mold reports with aggregated statistics. Requires admin role. Used for dashboard boxes and analytics.
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
 *         description: List of closed mold reports with aggregate data
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
export const getAggregatedClosedMoldReports = async (
  req: Request,
  res: Response
) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAllMoldReports(limit, true, pageToken); // true = closed reports
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-reports/aggregate/rejected:
 *   get:
 *     summary: Get aggregated rejected mold reports (future implementation)
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all rejected mold reports with aggregated statistics. Requires admin role. Used for dashboard boxes and analytics.
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
 *         description: List of rejected mold reports with aggregate data
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
export const getAggregatedRejectedMoldReports = async (
  req: Request,
  res: Response
) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    // TODO: Implement aggregated rejected reports logic with statistics
    // For now, using the standard rejected report retrieval
    // Future: Add aggregation logic for dashboard boxes
    const result: PaginatedResult<MoldReport[]> | null =
      await retrieveAllMoldReports(limit, true, pageToken); // true = closed/rejected reports
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);

    // TODO: Apply filtering for rejected status only
    // TODO: Add aggregated metrics (count by date, location, host, etc.)

    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-reports/unassigned:
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
 *                   description: The newly created case detail document
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Subcollection document ID
 *                     cover_photo:
 *                       type: array
 *                       items:
 *                         type: string
 *                     description:
 *                       type: string
 *                     timestamp:
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
      const created = await addCaseDetailToReport(
        id,
        details as MoldReportDetails
      );
      if (!created) {
        return sendError(res, "Failed to add case detail to report", 400);
      }
      await updateMoldReportInFirestore(id, {
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
          AuditAction.UPDATE_MOLD_REPORT,
          `User follow-up on report ${id}`,
          id
        );
      }
      return sendSuccess(res, created);
    }

    // Otherwise (curator/mycologist/admin), just append the case detail
    const created = await addCaseDetailToReport(
      id,
      details as MoldReportDetails
    );
    if (!created) {
      return sendError(res, "Failed to add case detail to report", 400);
    }
    return sendSuccess(res, created);
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
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Subcollection document ID
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
    const details: { assigned_mycologist_id: string; status?: string; priority?: string } =
      req.body;
    const updated = await updateMoldReportInFirestore(id, {
      assigned_mycologist_id: details.assigned_mycologist_id,
      // Cast here because DTO allows arbitrary string; repo enforces allowed statuses
      status: (details.status as any) || "in progress",
    });
    if (!updated) return sendError(res, "Failed to assign mycologist", 400);

    // Auto-create a MoldCase linked to this report if one doesn't exist yet.
    // This ensures GET /mold-case/by-report/:id works as soon as a mycologist is assigned.
    const existingCase = await retrieveMoldCaseByReportId(id);
    if (!existingCase) {
      await addMoldCaseToFirestore({
        mold_report_id: id,
        mycologist_id: details.assigned_mycologist_id,
        name: updated.case_name,
        user_id: updated.user_id,
        priority: (details.priority as "low" | "medium" | "high") ?? "low",
        start_date: Timestamp.now() as any,
        end_date: null as any,
        is_archived: false,
      });
      devLog(`[assignReport] Auto-created MoldCase for report=${id}`);
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
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Subcollection document ID
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
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-report/:id/review:
 *   patch:
 *     summary: Mark a mold report as reviewed by the authenticated mycologist
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Records the mycologist who reviewed the report and the review timestamp.
 */
export const reviewReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const actor = req.user;
    if (!actor) return sendError(res, "Unauthorized", 401);

    const reviewerId = actor.id;

    const updated = await updateMoldReportInFirestore(id, {
      reviewed_mycologist_id: reviewerId,
      reviewed_at: Timestamp.now(),
    });

    if (!updated) return sendError(res, "Failed to mark report as reviewed", 400);

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
 *                           id:
 *                             type: string
 *                             description: Subcollection document ID
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
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Subcollection document ID
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
 *     summary: Close a mold report
 *     tags: [MoldReport]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Close a mold report by setting its status to closed. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Mold report closed successfully
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
    return sendSuccess(res, "Successfully closed mold report.");
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

    // Filter by user ID if the user is a regular user (Role.USER / 'farmer')
    // Admins and Curators should be able to search all reports
    const userId = req.user?.user.role === Role.USER ? req.user?.id : undefined;

    const result: PaginatedResult<MoldReport[]> | null =
      await searchAndFilterMoldReports(
        searchQuery,
        status,
        priority,
        limit,
        pageToken,
        userId
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
