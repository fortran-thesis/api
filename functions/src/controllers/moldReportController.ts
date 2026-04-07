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
  "pending": ["in progress", "rejected", "closed"],
  "in progress": ["resolved", "rejected", "closed"],
  "resolved": ["rejected", "pending", "closed"],
  "rejected": ["pending"],
  "closed": ["pending"],
};

const normalizeStatus = (status: string): MoldReportLifecycleStatus | null => {
  const trimmed = status.trim().toLowerCase();
  if (trimmed === "in progress") return "in progress";
  if (trimmed === "pending") return "pending";
  if (trimmed === "resolved") return "resolved";
  if (trimmed === "rejected") return "rejected";
  if (trimmed === "closed") return "closed";
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
        return undefined;
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

    let result: PaginatedResult<MoldReport[]> | PaginatedResult<Omit<MoldReport, "user_id">[]> | null = null;

    if (actor.user.role === Role.ADMIN) {
      result = await retrieveAllMoldReports(limit, true, pageToken);
    } else if (actor.user.role === Role.CURATOR) {
      result = await retrieveAssignedMoldReports(uid, limit, pageToken, true);
    } else {
      result = await retrieveAllMoldReportsByUser(uid, limit, true, pageToken);
    }

    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

// Backward-compatible alias for legacy route handlers/imports
export const getAllArchivedMoldReports = getAllClosedMoldReports;

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

export const softDeleteMoldReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const current = await retrieveMoldReportById(id);
    if (!current) return sendError(res, "Mold report not found", 404);
    if (!canAccessReport(req.user, current)) return sendError(res, "Forbidden", 403);
    if (!canTransitionStatus(current.status, "closed")) {
      return sendError(res, `Cannot close report with status '${current.status}'`, 409);
    }

    await softRemoveMoldReport(id);
    return sendSuccess(res, "Successfully closed mold report.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
