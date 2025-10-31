import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldReport, MoldReportDetails, PaginatedResult} from "../types/types";
import {uploadFiles} from "../lib/storage";
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
  *                  date_observed:
  *                    type: string
  *                    format: date-time
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
        "mold_reports"
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

export const getAllMoldReportsByUser = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<Omit<MoldReport, "user_id">[]> | null = await retrieveAllMoldReportsByUser(uid, limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold reports", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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

export const rejectReport = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    // Mark as closed and clear assigned mycologist
    const updated = await updateMoldReportInFirestore(id, {
      status: "closed",
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
