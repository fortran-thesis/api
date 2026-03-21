import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldCase, PaginatedResult} from "../types/types";
import {
  addMoldCaseToFirestore,
  retrieveAllMoldCasesByUser,
  retrieveAssignedMoldCases,
  retrieveMoldCaseByReportId,
  updateMoldCaseInFirestore,
  removeMoldCase,
  softRemoveMoldCase,
  addCultivationLogToCase,
  updateCultivationDetailsInCase,
  getMoldCasesCountWithMetadata,
  searchAssignedMoldCasesByMycologist,
  retrieveMoldCaseById,
  getCultivationLogsFromCase,
  removeCultivationLogFromCase,
} from "../services/moldCaseService";
import {analyzeCultivationImage} from "../services/cultivationAnalysisService";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {Timestamp} from "firebase-admin/firestore";
import {retrieveMoldReportById, updateMoldReportInFirestore} from "../services/moldReportService";
import {performMoldLookup} from "../services/lookupService";

const getActorContext = (req: Request) => {
  const userId = req.user?.id;
  const role = String(req.user?.user?.role || "").toLowerCase();
  return {userId, role};
};

const isAdminRole = (role: string) => role === "admin" || role === "administrator";

const canReadMoldCase = (moldCase: MoldCase, userId?: string, role?: string) => {
  if (isAdminRole(role || "")) return true;
  if (!userId) return false;
  return moldCase.mycologist_id === userId || moldCase.user_id === userId;
};

const canManageMoldCase = (moldCase: MoldCase, userId?: string, role?: string) => {
  if (isAdminRole(role || "")) return true;
  if (!userId) return false;
  return moldCase.mycologist_id === userId;
};

export const createMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-cases:
   *   post:
   *     summary: Create a new mold folder
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               user_id:
   *                 type: string
   *               mycologist_id:
   *                 type: string
   *               name:
   *                 type: string
   *               mold_report_id:
   *                 type: string
   *               photo_url:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high]
   *               start_date:
   *                 type: string
   *                 format: date-time
   *               end_date:
   *                 type: string
   *                 format: date-time
   *               is_archived:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Successfully created mold folder
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
   *                     mycologist_id:
   *                       type: string
   *                     name:
   *                       type: string
   *                     mold_report_id:
   *                       type: string
   *                     photo_url:
   *                       type: string
   *                       nullable: true
   *                     priority:
   *                       type: string
   *                       enum: [low, medium, high]
   *                     start_date:
   *                       type: string
   *                       format: date-time
   *                     end_date:
   *                       type: string
   *                       format: date-time
   *                     is_archived:
   *                       type: boolean
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
    // Accept body directly (no multipart) or from body.details if present
    const details: Omit<MoldCase, "is_archived"> = req.body.details || req.body;
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }
    if (details.user_id && details.user_id !== userId) {
      return sendError(res, "user_id must match authenticated user", 403);
    }

    const moldCase: MoldCase | null = await addMoldCaseToFirestore({
      ...details,
      user_id: userId,
      is_archived: false,
    });
    if (!moldCase) return sendError(res, "Failed to create mold case", 400);
    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldCases = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders:
   *   get:
   *     summary: Get all mold folders for a user
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
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
   *         description: List of mold folders
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
   *                           mycologist_id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           mold_report_id:
   *                             type: string
   *                           photo_url:
   *                             type: string
   *                             nullable: true
   *                           priority:
   *                             type: string
   *                             enum: [low, medium, high]
   *                           start_date:
   *                             type: string
   *                             format: date-time
   *                           end_date:
   *                             type: string
   *                             format: date-time
   *                           is_archived:
   *                             type: boolean
   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
   *       401:
   *         description: Unauthorized
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
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAllMoldCasesByUser(uid, limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold cases", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAssignedMoldCases = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/assigned:
   *   get:
   *     summary: Get all mold cases assigned to the authenticated curator
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication with CURATOR role (Bearer token or session cookie)
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
   *         description: List of assigned mold cases
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
   *                           mycologist_id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           mold_report_id:
   *                             type: string
   *                           photo_url:
   *                             type: string
   *                             nullable: true
   *                           priority:
   *                             type: string
   *                             enum: [low, medium, high]
   *                           start_date:
   *                             type: string
   *                             format: date-time
   *                           end_date:
   *                             type: string
   *                             format: date-time
   *                           is_archived:
   *                             type: boolean
   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
   *       401:
   *         description: Unauthorized (not a curator)
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
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const mycologistId: string | undefined = req.user?.id;
  try {
    if (!mycologistId) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAssignedMoldCases(mycologistId, limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve assigned mold cases", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllArchivedMoldCases = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/mold-folders/archive:
   *   get:
   *     summary: Get all archived mold folders for a user
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
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
   *         description: List of archived mold folders
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
   *                           mycologist_id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           mold_report_id:
   *                             type: string
   *                           photo_url:
   *                             type: string
   *                             nullable: true
   *                           priority:
   *                             type: string
   *                             enum: [low, medium, high]
   *                           start_date:
   *                             type: string
   *                             format: date-time
   *                           end_date:
   *                             type: string
   *                             format: date-time
   *                           is_archived:
   *                             type: boolean
   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
   *       401:
   *         description: Unauthorized
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
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) {
      devLog("getAllArchivedMoldCases: No UID found in req.user");
      return sendError(res, "Unauthorized", 401);
    }
    devLog(`getAllArchivedMoldCases: Fetching archived cases for UID=${uid}, limit=${limit}`);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAllMoldCasesByUser(uid, limit, true, pageToken);
    if (!result) {
      devLog(`getAllArchivedMoldCases: retrieveAllMoldCasesByUser returned null for UID=${uid}`);
      return sendError(res, "Failed to retrieve mold cases", 404);
    }
    devLog(`getAllArchivedMoldCases: Successfully retrieved ${result.snapshot.length} archived cases`);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error, "getAllArchivedMoldCases error:");
    return defaultError(res);
  }
};

export const patchMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/{id}:
   *   patch:
   *     summary: Update a mold folder
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold folder ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               photo_url:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high]
   *               is_archived:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Successfully updated mold folder
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
   *                     mycologist_id:
   *                       type: string
   *                     name:
   *                       type: string
   *                     mold_report_id:
   *                       type: string
   *                     photo_url:
   *                       type: string
   *                       nullable: true
   *                     priority:
   *                       type: string
   *                       enum: [low, medium, high]
   *                     start_date:
   *                       type: string
   *                       format: date-time
   *                     end_date:
   *                       type: string
   *                       format: date-time
   *                     is_archived:
   *                       type: boolean
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
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    // Support both req.body.details and direct properties
    const details: Partial<MoldCase> = req.body.details || req.body;
    if (!details || Object.keys(details).length === 0) {
      return sendError(res, "No update data provided", 400);
    }
    const updated = await updateMoldCaseInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/{id}:
   *   delete:
   *     summary: Delete mold folder
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold folder ID
   *     responses:
   *       200:
   *         description: Successfully deleted mold folder
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
   *                   example: "Successfully deleted mold case"
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
    await removeMoldCase(id);
    return sendSuccess(res, "Successfully deleted mold case");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/soft/{id}:
   *   delete:
   *     summary: Soft delete mold folder
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold folder ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted mold folder
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
   *                   example: "Successfully soft deleted mold case."
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
    await softRemoveMoldCase(id);
    return sendSuccess(res, "Successfully soft deleted mold case.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-case/by-report/{id}:
 *   get:
 *     summary: Get mold case by report ID
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve the mold case associated with a given mold report ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold report ID
 *     responses:
 *       200:
 *         description: Mold case retrieved successfully
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
 *                     mycologist_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mold_report_id:
 *                       type: string
 *                     photo_url:
 *                       type: string
 *                       nullable: true
 *                     priority:
 *                       type: string
 *                       enum: [low, medium, high]
 *                     start_date:
 *                       type: string
 *                       format: date-time
 *                     end_date:
 *                       type: string
 *                       format: date-time
 *                     is_archived:
 *                       type: boolean
 *       404:
 *         description: No mold case found for this report
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
export const getMoldCaseByReportId = async (req: Request, res: Response) => {
  /**
   * GET /api/v1/mold-cases/by-report/:id
   * Retrieve the mold case associated with a given mold report ID
   */
  try {
    const reportId: string = req.params.id;
    const {userId, role} = getActorContext(req);
    const linkedReport = await retrieveMoldReportById(reportId);
    if (!linkedReport) return sendError(res, "Mold report not found", 404);

    const moldCase = await retrieveMoldCaseByReportId(reportId, linkedReport.user_id);
    if (!moldCase) return sendError(res, "No mold case found for this report", 404);

    const isReportOwner = !!userId && linkedReport.user_id === userId;
    if (!canReadMoldCase(moldCase, userId, role) && !isReportOwner) {
      return sendError(res, "Forbidden", 403);
    }

    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-case/{id}/logs:
 *   post:
 *     summary: Add a cultivation log entry to a mold case
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Add a cultivation log entry to a mold case with optional image upload. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold case ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [vivo, vitro]
 *                 description: Cultivation type (vivo for in vivo, vitro for in vitro)
 *               characteristics:
 *                 oneOf:
 *                   - type: object
 *                     description: For vivo cultivation
 *                     properties:
 *                       lesion_size:
 *                         type: number
 *                         description: Lesion size in millimeters
 *                       lesion_color:
 *                         type: string
 *                         description: Lesion color description
 *                   - type: object
 *                     description: For vitro cultivation
 *                     properties:
 *                       colony_diameter:
 *                         type: number
 *                         description: Colony diameter in millimeters
 *                       colony_color:
 *                         type: string
 *                         description: Colony color description
 *               additional_info:
 *                 type: string
 *                 description: Additional observations about the cultivation
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional cultivation log image
 *     responses:
 *       200:
 *         description: Cultivation log added successfully
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
 *                   description: The newly created cultivation log document
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Subcollection document ID
 *                     type:
 *                       type: string
 *                       enum: [vivo, vitro]
 *                     image_url:
 *                       type: string
 *                       nullable: true
 *                     characteristics:
 *                       type: object
 *                     additional_info:
 *                       type: string
 *       400:
 *         description: Failed to add cultivation log
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
export const addCultivationLog = async (req: Request, res: Response) => {
  /**
   * POST /api/v1/mold-cases/:id/logs
   * Add a cultivation log entry to a mold case (stored in subcollection)
   */
  try {
    const caseId: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const logData = req.body;

    // Handle image upload if provided
    if (req.file) {
      const storagePath = generateStoragePath(StorageFolder.CULTIVATION_LOGS, req.file.originalname);
      const uploadedPath = await uploadFile(
        storagePath,
        req.file.buffer,
        req.file.mimetype
      );

      if (!uploadedPath) {
        return sendError(res, "Failed to upload cultivation log image", 500);
      }

      logData.image_url = uploadedPath;
    }

    const created = await addCultivationLogToCase(caseId, logData);
    if (!created) return sendError(res, "Failed to add cultivation log", 400);
    return sendSuccess(res, created);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-case/{id}/cultivation-details:
 *   patch:
 *     summary: Update cultivation details for a mold case
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update cultivation details (in_vivo and/or in_vitro) for a mold case. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cultivation_details:
 *                 type: object
 *                 properties:
 *                   growth_medium:
 *                     type: string
 *                     description: Growth medium used for cultivation
 *                   in_vivo_details:
 *                     type: object
 *                     description: In vivo cultivation details
 *                     properties:
 *                       environmental_temperature:
 *                         type: number
 *                         description: Environmental temperature in Celsius
 *                   in_vitro_details:
 *                     type: object
 *                     description: In vitro cultivation details
 *                     properties:
 *                       incubation_temperature:
 *                         type: number
 *                         description: Incubation temperature in Celsius
 *     responses:
 *       200:
 *         description: Cultivation details updated successfully
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
 *                     mycologist_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mold_report_id:
 *                       type: string
 *                     photo_url:
 *                       type: string
 *                       nullable: true
 *                     priority:
 *                       type: string
 *                       enum: [low, medium, high]
 *                     start_date:
 *                       type: string
 *                       format: date-time
 *                     end_date:
 *                       type: string
 *                       format: date-time
 *                     is_archived:
 *                       type: boolean
 *                     cultivation_details:
 *                       type: object
 *                       properties:
 *                         growth_medium:
 *                           type: string
 *                         in_vivo_details:
 *                           type: object
 *                         in_vitro_details:
 *                           type: object
 *       400:
 *         description: Failed to update cultivation details
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
export const updateCultivationDetails = async (req: Request, res: Response) => {
  /**
   * PATCH /api/v1/mold-cases/:caseId/cultivation-details
   * Update cultivation details (in_vivo and/or in_vitro)
   */
  try {
    const caseId: string = req.params.id;
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const details = req.body;
    const updated = await updateCultivationDetailsInCase(caseId, details);
    if (!updated) return sendError(res, "Failed to update cultivation details", 400);

    // Re-run lookup in background if report has reported_* fields
    if (moldCase.mold_report_id) {
      const moldReport = await retrieveMoldReportById(moldCase.mold_report_id);
      if (moldReport) {
        devLog(`[updateCultivationDetails] Re-running lookup for report ${moldCase.mold_report_id}`);
        const reportedSymptoms = (moldReport as any).reported_symptoms || [];
        const reportedSigns = (moldReport as any).reported_signs || [];
        const reportedCharacteristics = (moldReport as any).reported_characteristics || [];

        // Extract characteristics from cultivation details if available.
        // Mobile sends nested `cultivation_details`, while some clients may send flat shape.
        const detailsPayload = (details?.cultivation_details ?? details ?? {}) as Record<string, any>;
        const additionalCharacteristics: string[] = [];
        if (detailsPayload.in_vivo_details?.lesion_color) {
          additionalCharacteristics.push(String(detailsPayload.in_vivo_details.lesion_color));
        }
        if (detailsPayload.in_vitro_details?.colony_color) {
          additionalCharacteristics.push(String(detailsPayload.in_vitro_details.colony_color));
        }
        if (Array.isArray(detailsPayload.initial_characteristics)) {
          additionalCharacteristics.push(
            ...detailsPayload.initial_characteristics.map((v: unknown) => String(v))
          );
        }

        const allCharacteristics = [...reportedCharacteristics, ...additionalCharacteristics];

        // Run lookup in background
        performMoldLookup(reportedSymptoms, reportedSigns, allCharacteristics)
          .then(async (lookupResults) => {
            try {
              await updateMoldReportInFirestore(moldCase.mold_report_id, {
                lookup_results: lookupResults.map((r) => ({
                  ...r,
                  timestamp: Timestamp.now(),
                })),
              });
              devLog(`[updateCultivationDetails] ✅ Updated lookup results: ${lookupResults.length} matches`);
            } catch (err) {
              devLog(`[updateCultivationDetails] ⚠️ Failed to update lookup results: ${err}`);
            }
          })
          .catch((err) => {
            devLog(`[updateCultivationDetails] ❌ Lookup failed: ${err}`);
          });
      }
    }

    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-case/{id}/analyze-cultivation:
 *   post:
 *     summary: Analyze cultivation image using AI
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Analyze a cultivation image using Gemini AI to provide insights. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold case ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - image
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [vivo, vitro]
 *                 description: Cultivation type (vivo for in vivo, vitro for in vitro)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Cultivation image to analyze (JPEG or PNG)
 *     responses:
 *       200:
 *         description: Image analyzed successfully
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
 *                     type:
 *                       type: string
 *                       enum: [vivo, vitro]
 *                       description: Cultivation type analyzed
 *                     characteristics:
 *                       oneOf:
 *                         - type: object
 *                           description: Vivo analysis characteristics
 *                           properties:
 *                             lesion_size:
 *                               type: number
 *                               description: Lesion size in millimeters
 *                             lesion_color:
 *                               type: string
 *                               description: Predominant lesion color
 *                         - type: object
 *                           description: Vitro analysis characteristics
 *                           properties:
 *                             colony_diameter:
 *                               type: number
 *                               description: Colony diameter in millimeters
 *                             colony_color:
 *                               type: string
 *                               description: Predominant colony color
 *                     additional_info:
 *                       type: string
 *                       description: Additional observations about the cultivation
 *                     confidence:
 *                       type: string
 *                       description: Confidence level of the analysis (percentage)
 *       400:
 *         description: Invalid cultivation type or no image provided
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
 *         description: Failed to analyze image
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
export const analyzeCultivationLogImage = async (req: Request, res: Response) => {
  /**
   * POST /api/v1/mold-cases/:id/analyze-cultivation
   * Analyze cultivation image using Gemini AI
   *
   * Body:
   * - type: "vivo" | "vitro" (cultivation type)
   * - file: image file (via multer)
   */
  try {
    const cultivationType = req.body.type as "vivo" | "vitro";

    if (!cultivationType || (cultivationType !== "vivo" && cultivationType !== "vitro")) {
      return sendError(res, "Invalid cultivation type. Must be 'vivo' or 'vitro'", 400);
    }

    if (!req.file) {
      return sendError(res, "No image file provided", 400);
    }

    // Analyze the image using Gemini
    const analysis = await analyzeCultivationImage(req.file.buffer, cultivationType);

    if (!analysis) {
      return sendError(res, "Failed to analyze image", 500);
    }

    return sendSuccess(res, analysis);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-cases/search:
 *   get:
 *     summary: Search and filter assigned mold cases for mycologist
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: |
 *       Search and filter mold cases assigned to the authenticated mycologist.
 *       Supports searching by case name and filtering by priority.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for case name
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by mold case priority
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
 *         description: Filtered and searched mold cases
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
 *                     snapshot:
 *                       type: array
 *                       items:
 *                         type: object
 *                     nextPageToken:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
export const searchAssignedMoldCases = async (req: Request, res: Response) => {
  try {
    const mycologistId = req.user?.id;
    if (!mycologistId) {
      return sendError(res, "Not authenticated", 401);
    }

    const searchQuery: string | undefined = req.query.search as string | undefined;
    const priority: string | undefined = req.query.priority as string | undefined;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as string | undefined;


    const result = await searchAssignedMoldCasesByMycologist(
      mycologistId,
      searchQuery,
      priority,
      limit,
      pageToken
    );

    if (!result) {
      return sendError(res, "Failed to search mold cases", 500);
    }

    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get mold cases count with metadata (latest createdAt timestamp)
 * Admin only endpoint
 *
 * @route GET /api/v1/mold-cases/counts/metadata
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: Count and metadata, 500: Server error
 * @access Admin only
 */
export const getMoldCasesCountMetadataController = async (req: Request, res: Response) => {
  try {
    const metadata = await getMoldCasesCountWithMetadata();
    if (!metadata) {
      return sendError(res, "Failed to retrieve mold cases metadata", 500);
    }

    return sendSuccess(res, metadata);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

// ─── Case History / Archived ────────────────────────────────────────────────

export const getMoldCaseById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/{id}:
   *   get:
   *     summary: Get a mold case by ID
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold case ID
   *     responses:
   *       200:
   *         description: Mold case retrieved successfully
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
   *                     mycologist_id:
   *                       type: string
   *                     name:
   *                       type: string
   *                     mold_report_id:
   *                       type: string
   *                     photo_url:
   *                       type: string
   *                       nullable: true
   *                     priority:
   *                       type: string
   *                       enum: [low, medium, high]
   *                     start_date:
   *                       type: string
   *                       format: date-time
   *                     end_date:
   *                       type: string
   *                       format: date-time
   *                     is_archived:
   *                       type: boolean
   *                     cultivation_details:
   *                       type: object
   *                       nullable: true
   *       404:
   *         description: Mold case not found
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
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    return sendSuccess(res, moldCase);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const archiveMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/{id}/archive:
   *   patch:
   *     summary: Archive a mold case (move to case history)
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Sets is_archived to true, moving the case to case history. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold case ID
   *     responses:
   *       200:
   *         description: Mold case archived successfully
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
   *                     is_archived:
   *                       type: boolean
   *                       example: true
   *       404:
   *         description: Mold case not found
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
    const updated = await updateMoldCaseInFirestore(id, {is_archived: true} as Partial<MoldCase>);
    if (!updated) return sendError(res, "Failed to archive mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const unarchiveMoldCase = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/{id}/unarchive:
   *   patch:
   *     summary: Restore a mold case from case history (unarchive)
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Sets is_archived to false, restoring the case to active. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold case ID
   *     responses:
   *       200:
   *         description: Mold case restored successfully
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
   *                     is_archived:
   *                       type: boolean
   *                       example: false
   *       404:
   *         description: Mold case not found
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
    const updated = await updateMoldCaseInFirestore(id, {is_archived: false} as Partial<MoldCase>);
    if (!updated) return sendError(res, "Failed to unarchive mold case", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getCultivationLogs = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/{id}/logs:
   *   get:
   *     summary: Get all cultivation logs for a mold case
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Returns paginated cultivation logs from the subcollection. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold case ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Maximum number of logs to return
   *       - in: query
   *         name: pageToken
   *         schema:
   *           type: string
   *         description: Cursor token for pagination
   *     responses:
   *       200:
   *         description: Cultivation logs retrieved successfully
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
   *                             description: Subcollection document ID
   *                           type:
   *                             type: string
   *                             enum: [vivo, vitro]
   *                           image_url:
   *                             type: string
   *                             nullable: true
   *                           characteristics:
   *                             type: object
   *                           additional_info:
   *                             type: string
   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
   *                       description: Token for fetching next page of results
   *       404:
   *         description: Mold case not found
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
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canReadMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const pageToken = req.query.pageToken as string | undefined;
    const result = await getCultivationLogsFromCase(id, limit, pageToken);
    if (result === null) return sendError(res, "Mold case not found", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const removeCultivationLog = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-case/{id}/logs/{logId}:
   *   delete:
   *     summary: Remove a cultivation log entry by ID
   *     tags: [MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Removes the cultivation log with the given document ID from the subcollection. Requires authentication.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold case ID
   *       - in: path
   *         name: logId
   *         required: true
   *         schema:
   *           type: string
   *         description: Cultivation log document ID
   *     responses:
   *       200:
   *         description: Cultivation log removed successfully
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
   *                     deleted:
   *                       type: boolean
   *       400:
   *         description: Invalid log ID
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
   *         description: Mold case or log not found
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
    const moldCase = await retrieveMoldCaseById(id);
    if (!moldCase) return sendError(res, "Mold case not found", 404);

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    const logId: string = req.params.logId;
    if (!logId || !logId.trim()) {
      return sendError(res, "Log ID is required.", 400);
    }
    const deleted = await removeCultivationLogFromCase(id, logId);
    if (!deleted) return sendError(res, "Mold case or log not found", 404);
    return sendSuccess(res, {deleted: true});
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold-cases/{id}/verdict:
 *   patch:
 *     summary: Finalize mold verdict for a case
 *     tags: [MoldCases]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Record the final mycologist verdict for a mold case based on lookup results
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moldId:
 *                 type: string
 *                 description: ID of the identified mold
 *               moldName:
 *                 type: string
 *                 description: Name of the identified mold
 *               confidence:
 *                 type: number
 *                 description: Confidence score (0-100)
 *               mycologist_notes:
 *                 type: string
 *                 description: Optional notes from the mycologist
 *             required:
 *               - moldId
 *               - moldName
 *               - confidence
 *     responses:
 *       200:
 *         description: Verdict finalized successfully
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
 *                     moldCaseId:
 *                       type: string
 *                     final_verdict:
 *                       type: object
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export const finalizeVerdict = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const {moldId, moldName, confidence, mycologist_notes: mycologistNotes} = req.body;

    // Validate required fields
    if (!moldId || !moldId.trim()) {
      return sendError(res, "moldId is required", 400);
    }
    if (!moldName || !moldName.trim()) {
      return sendError(res, "moldName is required", 400);
    }
    if (typeof confidence !== "number" || confidence < 0 || confidence > 100) {
      return sendError(res, "confidence must be a number between 0 and 100", 400);
    }

    // Retrieve the case to get the report ID
    const moldCase = await retrieveMoldCaseById(caseId);
    if (!moldCase) {
      return sendError(res, "Mold case not found", 404);
    }

    const {userId, role} = getActorContext(req);
    if (!canManageMoldCase(moldCase, userId, role)) {
      return sendError(res, "Forbidden", 403);
    }

    // Update the mold case with final verdict
    const verdict = {
      moldId,
      moldName,
      confidence,
      verdict_timestamp: Timestamp.now(),
      ...(mycologistNotes !== undefined ? {mycologist_notes: mycologistNotes} : {}),
    };

    const updatedCase = await updateMoldCaseInFirestore(caseId, {
      final_verdict: verdict,
    });

    if (!updatedCase) {
      return sendError(res, "Failed to update mold case with verdict", 400);
    }

    // Update the associated report status to resolved and surface failures explicitly.
    let reportSyncWarning: string | null = null;
    if (moldCase.mold_report_id) {
      try {
        const linkedReport = await retrieveMoldReportById(moldCase.mold_report_id);
        if (!linkedReport) {
          reportSyncWarning = "Verdict saved, but linked report could not be found";
        } else if (linkedReport.status !== "in progress") {
          reportSyncWarning = `Verdict saved, but report status '${linkedReport.status}' cannot transition to 'resolved'`;
        }

        if (reportSyncWarning) {
          devLog(`[finalizeVerdict] Warning: ${reportSyncWarning}`);
        }

        if (!reportSyncWarning) {
        const reportUpdated = await updateMoldReportInFirestore(moldCase.mold_report_id, {
          status: "resolved",
        });
        if (!reportUpdated) {
          reportSyncWarning = "Verdict saved, but report status sync did not persist";
          devLog(`[finalizeVerdict] Warning: Report status sync returned no update for report ${moldCase.mold_report_id}`);
        }
        }
      } catch (err) {
        reportSyncWarning = "Verdict saved, but report status sync failed";
        devLog(`[finalizeVerdict] Warning: Failed to update report status: ${err}`);
      }
    }

    devLog(`[finalizeVerdict] ✅ Verdict finalized for case ${caseId}: ${moldName} (${confidence}%)`);
    return sendSuccess(res, {
      moldCaseId: caseId,
      report_owner_id: moldCase.user_id ?? null,
      case_name: moldCase.name ?? "",
      final_verdict: verdict,
      report_sync_warning: reportSyncWarning,
    });
  } catch (error) {
    devLog("[finalizeVerdict] Error:", String(error));
    return defaultError(res);
  }
};
