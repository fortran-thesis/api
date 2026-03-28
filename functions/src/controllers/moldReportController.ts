import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldCase, MoldReport, MoldReportDetails, PaginatedResult} from "../types/types";
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
  getRawCaseCoverPhoto,
} from "../services/moldReportService";
import {performMoldLookup} from "../services/lookupService";
import {createLog} from "../utils/logging";
import {AuditAction, Role} from "../types/enums";
import {getCombinedTotalCounts, getMoldCasePriorityBreakdown, addMoldCaseToFirestore, retrieveMoldCaseByReportId, updateMoldCaseInFirestore} from "../services/moldCaseService";
import {createBatchNotifications} from "../services/notificationService";
import {getAdminUserIds} from "../services/userService";
import {NotificationType} from "../types/models/notificationTypes";
import {Timestamp} from "firebase-admin/firestore";

type MoldReportLifecycleStatus = MoldReport["status"];

const ALLOWED_STATUS_TRANSITIONS: Record<MoldReportLifecycleStatus, MoldReportLifecycleStatus[]> = {
  "pending": ["in progress", "rejected"],
  "in progress": ["resolved", "rejected"],
  "resolved": ["rejected", "pending"],
  "rejected": ["pending"],
};

const normalizeStatus = (status: string): MoldReportLifecycleStatus | null => {
  const trimmed = status.trim().toLowerCase();
  if (trimmed === "in progress") return "in progress";
  if (trimmed === "pending") return "pending";
  if (trimmed === "resolved") return "resolved";
  if (trimmed === "rejected") return "rejected";
  return null;
};

const canTransitionStatus = (from: MoldReportLifecycleStatus, to: MoldReportLifecycleStatus): boolean => {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
};

const canAccessReport = (
  actor: Request["user"],
  report: MoldReport
): boolean => {
  if (!actor) return false;
  const role = actor.user.role;
  if (role === Role.ADMIN) return true;
  if (role === Role.CURATOR) {
    return report.assigned_mycologist_id === actor.id || report.user_id === actor.id;
  }
  return report.user_id === actor.id;
};

const extractCaseCoverPhoto = (report: MoldReport): string | null => {
  const details = Array.isArray(report.case_details) ? report.case_details : [];
  for (let i = details.length - 1; i >= 0; i--) {
    const entry = details[i];
    const cover = Array.isArray(entry?.cover_photo) ? entry.cover_photo : [];
    const first = cover.find((url) => typeof url === "string" && url.trim().length > 0);
    if (first) return first;
  }
  return null;
};

export const createMoldReport = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-report:
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
   *             required:
   *               - case_name
   *               - host
   *               - location
   *               - date_observed
   *               - description
   *             properties:
   *               case_name:
   *                 type: string
   *               host:
   *                 type: string
   *                 description: Crop or surface name (e.g., "rice", "drywall").
   *               location:
   *                 type: string
   *                 description: City/province where mold was observed.
   *               date_observed:
   *                 type: string
   *                 format: date-time
   *                 description: ISO 8601 string. Converted to Firestore Timestamp.
   *               description:
   *                 type: string
   *               reported_symptoms:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Used for background mold lookup. Saved synchronously to Firestore, then lookup runs asynchronously and writes `lookup_results` to the report.
   *               reported_signs:
   *                 type: array
   *                 items:
   *                   type: string
   *               reported_characteristics:
   *                 type: array
   *                 items:
   *                   type: string
   *               cover_photo:
   *                 type: string
   *                 format: binary
   *                 description: Optional. Uploaded asynchronously after the report document is created. The URL is written to the first case_detail subcollection document when the upload completes.
   *     responses:
   *       200:
   *         description: Mold report created. `case_details` in the response is the array provided in the request body — it is not stored in the parent Firestore document. Subsequent GETs hydrate `case_details` from the `mold_reports/{id}/case_details` subcollection. Photo upload (if any) runs in the background; the URL is not yet present in the response.
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
   *                     priority:
   *                       type: string
   *                       enum: [low, medium, high]
   *                       nullable: true
   *                     reviewed_mycologist_id:
   *                       type: string
   *                       nullable: true
   *                     reviewed_at:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     reported_symptoms:
   *                       type: array
   *                       items:
   *                         type: string
   *                       nullable: true
   *                     reported_signs:
   *                       type: array
   *                       items:
   *                         type: string
   *                       nullable: true
   *                     reported_characteristics:
   *                       type: array
   *                       items:
   *                         type: string
   *                       nullable: true
   *                     rejection_reason:
   *                       type: string
   *                       nullable: true
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
   *       x-side-effects:
   *         - If `reported_symptoms`, `reported_signs`, or `reported_characteristics` are non-empty, a keyword-based mold lookup runs in the background and writes `lookup_results` to the report document. The response will not contain `lookup_results`.
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
    devLog(`[createMoldReport] Received ${photos?.length || 0} photos`);

    // Validate required fields
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

    devLog(
      `[createMoldReport] Extracted reported fields - symptoms: ${reportedSymptoms.length}, signs: ${reportedSigns.length}, characteristics: ${reportedCharacteristics.length}`
    );

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
        devLog("[createMoldReport] Synchronously saved reported fields");

        // NOW run the async lookup task (do not await)
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

    // Fire-and-forget: notify all admins of the new mold report
    getAdminUserIds()
      .then((adminIds) => {
        if (adminIds.length > 0) {
          return createBatchNotifications(
            adminIds.map((id) => ({recipientId: id})),
            NotificationType.MOLD_REPORT_CREATED,
            {case_name: (moldReport as any).case_name},
            (moldReport as any).id,
            "mold_report"
          );
        }
      })
      .catch((err) => {
        devLog(`[createMoldReport] ⚠️ Failed to notify admins: ${err}`);
      });

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
    // Show all counts for admins and mycologists (they need system-wide visibility)
    // Farmers only see their own reports
    const userRole = req.user?.user.role?.toLowerCase() || "";
    const userId = userRole === "admin" || userRole === "mycologist" ? undefined : req.user?.id;

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
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [own, assigned, all]
 *         description: Controls which reports are returned. `own` returns reports created by the authenticated user (default for farmers). `assigned` returns reports assigned to the authenticated mycologist (default for curators). `all` returns all reports (admin only; returns 403 for non-admin). If omitted, defaults based on the caller's role.
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
 *                           priority:
 *                             type: string
 *                             enum: [low, medium, high]
 *                             nullable: true
 *                           reviewed_mycologist_id:
 *                             type: string
 *                             nullable: true
 *                             description: ID of the mycologist who reviewed this report
 *                           reviewed_at:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: Timestamp when the report was reviewed
 *                           reported_symptoms:
 *                             type: array
 *                             items:
 *                               type: string
 *                             nullable: true
 *                             description: Symptoms reported by the user
 *                           reported_signs:
 *                             type: array
 *                             items:
 *                               type: string
 *                             nullable: true
 *                             description: Signs reported by the user
 *                           reported_characteristics:
 *                             type: array
 *                             items:
 *                               type: string
 *                             nullable: true
 *                             description: Characteristics reported by the user
 *                           lookup_results:
 *                             type: array
 *                             nullable: true
 *                             description: Results from background mold lookup. May be updated asynchronously after report creation.
 *                             items:
 *                               type: object
 *                               properties:
 *                                 moldId:
 *                                   type: string
 *                                 moldName:
 *                                   type: string
 *                                 confidence:
 *                                   type: number
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   nullable: true
 *                           rejection_reason:
 *                             type: string
 *                             nullable: true
 *                             description: Reason for rejection if status is rejected
 *                           case_details:
 *                             type: array
 *                             nullable: true
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
 *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
 *       403:
 *         description: Non-admin caller requested `scope=all`.
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
    const actor = req.user;
    if (!actor) return sendError(res, "Unauthorized", 401);

    const requestedScope = (req.query.scope as string | undefined)?.toLowerCase();
    const defaultScope = actor.user.role === Role.ADMIN ? "all" : actor.user.role === Role.CURATOR ? "assigned" : "own";
    const scope = requestedScope || defaultScope;

    if (!["all", "own", "assigned"].includes(scope)) {
      return sendError(res, "Invalid scope. Allowed: all, own, assigned", 400);
    }

    if (scope === "all" && actor.user.role !== Role.ADMIN) {
      return sendError(res, "Forbidden", 403);
    }

    let result: PaginatedResult<MoldReport[]> | PaginatedResult<Omit<MoldReport, "user_id">[]> | null = null;
    if (scope === "all") {
      result = await retrieveAllMoldReports(limit, false, pageToken);
    } else if (scope === "assigned") {
      result = await retrieveAssignedMoldReports(actor.id, limit, pageToken);
    } else {
      result = await retrieveAllMoldReportsByUser(actor.id, limit, false, pageToken);
    }

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
 * /api/v1/mold-report/user/closed:
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
    const actor = req.user;
    if (!actor || !uid) return sendError(res, "Unauthorized", 401);

    const result: PaginatedResult<MoldReport[]> | PaginatedResult<Omit<MoldReport, "user_id">[]> | null =
      actor.user.role === Role.ADMIN ?
        await retrieveAllMoldReports(limit, true, pageToken) :
        await retrieveAllMoldReportsByUser(uid, limit, true, pageToken);

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
 * /api/v1/mold-report/aggregate/closed:
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
 * /api/v1/mold-report/aggregate/rejected:
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Report not found
 *       409:
 *         description: Cannot add follow-up in the report's current status
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

    if (!actor) return sendError(res, "Unauthorized", 401);
    if (!canAccessReport(actor, report)) {
      return sendError(res, "Forbidden", 403);
    }

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
      if (!canTransitionStatus(report.status, "pending")) {
        return sendError(res, `Cannot add follow-up while report is '${report.status}'`, 409);
      }

      await updateMoldReportInFirestore(id, {
        status: "pending",
        assigned_mycologist_id: null,
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
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expected end date. Written to the auto-created MoldCase document.
 *     responses:
 *       200:
 *         description: Mycologist assigned. Status set to `in progress`. A MoldCase is automatically created (or repaired if one already exists) and linked to this report. The response is the full updated report including enriched `reporter` object and `priority` from the linked MoldCase.
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
 *                     reporter:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     priority:
 *                       type: string
 *                       enum: [low, medium, high]
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
 *       400:
 *         description: Failed to assign mycologist
 *       409:
 *         description: Report is already assigned to a mycologist, or the current status does not allow transition to `in progress` (e.g., status is `resolved` or `rejected`).
 *       500:
 *         description: Server error
 */
export const assignReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: { assigned_mycologist_id: string; status?: string; end_date?: Timestamp } =
      req.body;

    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);

    // Check if this is a reassignment (already in progress) or new assignment (pending)
    const isReassignment = current.status === "in progress" && !!current.assigned_mycologist_id;
    const previousMycologistId = current.assigned_mycologist_id;

    // For new assignments, check status transition
    if (!isReassignment && !canTransitionStatus(current.status, "in progress")) {
      return sendError(res, `Cannot assign report with status '${current.status}'`, 409);
    }

    // Check capacity: mycologist must have fewer than 3 active cases
    const currentCount = await getAssignedReportsCount(details.assigned_mycologist_id);
    if (currentCount !== null && currentCount >= 3) {
      return sendError(res, "Mycologist has reached maximum case capacity (3)", 409);
    }

    const normalizedStatus: MoldReport["status"] = isReassignment ? current.status : "in progress";

    const casePriority = ((current as any).priority as "low" | "medium" | "high" | undefined) ?? "low";

    const updated = await updateMoldReportInFirestore(id, {
      assigned_mycologist_id: details.assigned_mycologist_id,
      status: normalizedStatus,
    });
    if (!updated) return sendError(res, "Failed to assign mycologist", 400);

    // Prefer raw GS path from case_details subcollection to avoid persisting signed URLs.
    const casePhotoUrl =
      (await getRawCaseCoverPhoto(id)) || extractCaseCoverPhoto(updated);

    // Auto-create a MoldCase linked to this report if one doesn't exist yet.
    // This ensures GET /mold-case/by-report/:id works as soon as a mycologist is assigned.
    const reportOwnerId = updated.user_id || current.user_id;
    const existingCase = await retrieveMoldCaseByReportId(id, reportOwnerId);
    if (!existingCase) {
      await addMoldCaseToFirestore({
        mold_report_id: id,
        mycologist_id: details.assigned_mycologist_id,
        name: updated.case_name,
        user_id: reportOwnerId,
        priority: casePriority,
        start_date: Timestamp.now() as any,
        end_date: (details.end_date ?? null) as any,
        photo_url: casePhotoUrl,
        is_archived: false,
      });
      devLog(`[assignReport] Auto-created MoldCase for report=${id}`);
    } else {
      const existingCaseId = (existingCase as any)?.id as string | undefined;
      if (!existingCaseId) {
        return sendSuccess(res, updated);
      }
      // Self-heal older/stale docs where ownership drifted to a non-reporter user.
      const needsOwnerRepair = existingCase.user_id !== reportOwnerId;
      const needsMycologistRepair = existingCase.mycologist_id !== details.assigned_mycologist_id;
      const needsEndDateRepair = !!details.end_date && !existingCase.end_date;
      const needsPhotoRepair = !!casePhotoUrl && !existingCase.photo_url;
      // For reassignments, always update mycologist_id even if it was already set
      if (needsOwnerRepair || needsMycologistRepair || needsEndDateRepair || needsPhotoRepair || isReassignment) {
        await updateMoldCaseInFirestore(existingCaseId, {
          user_id: reportOwnerId,
          mycologist_id: details.assigned_mycologist_id,
          end_date: details.end_date,
          ...(needsPhotoRepair ? {photo_url: casePhotoUrl} : {}),
        } as Partial<MoldCase>);
        devLog(`[assignReport] ${isReassignment ? "Reassigned" : "Repaired"} MoldCase ownership/assignee for report=${id}`);
      }
    }

    // Send unassignment notification to the previous mycologist if reassigning
    if (isReassignment && previousMycologistId && previousMycologistId !== details.assigned_mycologist_id) {
      await createBatchNotifications(
        [{recipientId: previousMycologistId}],
        NotificationType.MOLD_REPORT_UNASSIGNED,
        {case_name: updated.case_name ?? ""},
        id,
        "mold_report"
      );
      devLog(`[assignReport] Sent unassignment notification to previous mycologist ${previousMycologistId}`);
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason for rejection. Stored on the report and included in the notification sent to the report owner.
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
 *       409:
 *         description: Current report status does not permit a transition to `rejected`. Only `pending` and `in progress` reports can be rejected.
 *       500:
 *         description: Server error
 */
export const rejectReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const rejectionReason: string = req.body.rejection_reason;
    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canTransitionStatus(current.status, "rejected")) {
      return sendError(res, `Cannot reject report with status '${current.status}'`, 409);
    }

    // Mark as rejected and clear assigned mycologist
    const updated = await updateMoldReportInFirestore(id, {
      status: "rejected",
      assigned_mycologist_id: null,
      rejection_reason: rejectionReason,
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
 * /api/v1/mold-report/{id}/review:
 *   patch:
 *     summary: Mark a mold report as reviewed by the authenticated mycologist
 *     tags: [MoldReport]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
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

    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canAccessReport(actor, current)) return sendError(res, "Forbidden", 403);

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
 *       403:
 *         description: Forbidden
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
    if (!canAccessReport(req.user, report)) return sendError(res, "Forbidden", 403);
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
 *     description: |
 *       Updates editable fields on a mold report.
 *       Two fields are explicitly blocked:
 *       - `assigned_mycologist_id` — use `PATCH /:id/assign` instead (returns 400).
 *       - Status transitions to `in progress` or `rejected` — use `/:id/assign` or `/:id/reject` respectively (returns 400).
 *       Only the `resolved` status transition is permitted through this endpoint (from `in progress`).
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
 *       409:
 *         description: Invalid status transition. The requested status cannot follow the current report status per the allowed transition rules: pending → in progress | rejected; in progress → resolved | rejected; resolved → rejected | pending; rejected → pending.
 *       500:
 *         description: Server error
 */
export const patchMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<MoldReport> & {status?: string} = req.body;

    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canAccessReport(req.user, current)) return sendError(res, "Forbidden", 403);

    if (details.assigned_mycologist_id !== undefined) {
      return sendError(res, "Use /:id/assign to change mycologist assignment", 400);
    }

    if (details.status !== undefined) {
      const normalizedTargetStatus = normalizeStatus(details.status);
      if (!normalizedTargetStatus) {
        return sendError(res, "Invalid status value", 400);
      }

      if (!canTransitionStatus(current.status, normalizedTargetStatus)) {
        return sendError(
          res,
          `Invalid status transition from '${current.status}' to '${normalizedTargetStatus}'`,
          409
        );
      }

      // Keep explicit lifecycle endpoints for assignment/rejection workflows.
      if (normalizedTargetStatus === "in progress" || normalizedTargetStatus === "rejected") {
        return sendError(res, "Use /:id/assign or /:id/reject for this transition", 400);
      }

      (details as any).status = normalizedTargetStatus;
    }

    const updated = await updateMoldReportInFirestore(id, details as Partial<MoldReport>);
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Mold report not found
 *       500:
 *         description: Server error
 */
export const deleteMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canAccessReport(req.user, current)) return sendError(res, "Forbidden", 403);
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Mold report not found
 *       409:
 *         description: Invalid status transition for close operation
 *       500:
 *         description: Server error
 */
export const softDeleteMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canAccessReport(req.user, current)) return sendError(res, "Forbidden", 403);
    if (!canTransitionStatus(current.status, "rejected")) {
      return sendError(res, `Cannot close report with status '${current.status}'`, 409);
    }

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
 *       Search and filter mold reports. When the caller is a mycologist (curator role), results are always filtered to reports assigned to that mycologist, regardless of the `scope` parameter. Admins see all reports. Farmers see only their own reports.
 *
 *       Note: when `priority` is specified, a lookup against the `mold_cases` collection is performed first to find matching report IDs. If no cases match the priority, an empty result is returned immediately without querying reports.
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
    const actor = req.user;
    if (!actor) return sendError(res, "Unauthorized", 401);

    const searchQuery: string | undefined = req.query.search as
      | string
      | undefined;
    const status: string | undefined = req.query.status as string | undefined;
    const scope: string | undefined = req.query.scope as string | undefined;
    const priority: string | undefined = req.query.priority as
      | string
      | undefined;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as
      | string
      | undefined;

    let userId: string | undefined;
    let assignedOnlyId: string | undefined;

    if (scope === "all") {
      if (actor.user.role !== Role.ADMIN) {
        return sendError(res, "Forbidden", 403);
      }
    } else if (scope === "assigned") {
      if (actor.user.role === Role.ADMIN) {
        // admins can search across all by default
      } else if (actor.user.role === Role.CURATOR) {
        assignedOnlyId = actor.id;
      } else {
        return sendError(res, "Forbidden", 403);
      }
    } else {
      // default scope: own for farmer, assigned for curator, all for admin
      if (actor.user.role === Role.ADMIN) {
        userId = undefined;
      } else if (actor.user.role === Role.CURATOR) {
        assignedOnlyId = actor.id;
      } else {
        userId = actor.id;
      }
    }

    const result =
      await searchAndFilterMoldReports(
        searchQuery,
        status,
        priority,
        limit,
        pageToken,
        userId
      );

    if (!result) return sendError(res, "Failed to retrieve mold reports", 500);

    if (assignedOnlyId) {
      return sendSuccess(res, {
        ...result,
        snapshot: result.snapshot.filter((report) => report.assigned_mycologist_id === assignedOnlyId),
      });
    }

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
