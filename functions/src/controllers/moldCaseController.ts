import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MoldCase, PaginatedResult} from "../types/types";
import {
  addMoldCaseToFirestore,
  retrieveAllMoldCasesByUser,
  retrieveAssignedMoldCases,
  retrieveMoldCasesByMoldipediaId,
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
import {retrieveAllMoldipedia} from "../services/moldipediaService";

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
  * /api/v1/mold-case:
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
   *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
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
  * /api/v1/mold-case:
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
   *       403:
   *         description: Forbidden
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
   *                           id:
   *                             type: string
   *                           mycologist_id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           mold_report_id:
   *                             type: string
   *                           user_id:
   *                             type: string
   *                             nullable: true
   *                           user_name:
   *                             type: string
   *                             nullable: true
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
   *                           cultivation_details:
   *                             type: object
   *                             nullable: true
   *                           final_verdict:
   *                             type: object
   *                             nullable: true
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
   *       403:
   *         description: Forbidden
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
   * /api/v1/mold-case/archive:
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
   *       403:
   *         description: Forbidden
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
  * /api/v1/mold-case/{id}:
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
   *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
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
  * /api/v1/mold-case/hard/{id}:
   *   delete:
  *     summary: Hard delete mold case
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
  *         description: Successfully deleted mold case
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
  * /api/v1/mold-case/soft/{id}:
   *   delete:
  *     summary: Soft delete mold case
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
  *         description: Successfully soft deleted mold case
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
 *                     user_id:
 *                       type: string
 *                       nullable: true
 *                       description: ID of the farmer/user who created the mold report
 *                     user_name:
 *                       type: string
 *                       nullable: true
 *                       description: Display name of the farmer/user
 *                     photo_url:
 *                       type: string
 *                       nullable: true
 *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
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
 *                       description: Detailed cultivation information including growth conditions and observations
 *                       properties:
 *                         growth_medium:
 *                           type: string
 *                         in_vivo_details:
 *                           type: object
 *                           properties:
 *                             environmental_temperature:
 *                               type: number
 *                         in_vitro_details:
 *                           type: object
 *                           properties:
 *                             incubation_temperature:
 *                               type: number
 *                         specimen_types:
 *                           type: array
 *                           items:
 *                             type: string
 *                         specimen_quantities:
 *                           type: array
 *                           items:
 *                             type: string
 *                         initial_symptoms:
 *                           type: array
 *                           items:
 *                             type: string
 *                         initial_characteristics:
 *                           type: array
 *                           items:
 *                             type: string
 *                         location_gathered:
 *                           type: string
 *                         initial_microscopic:
 *                           type: string
 *                         initial_macroscopic:
 *                           type: string
 *                         initial_microscopic_color:
 *                           type: string
 *                         initial_microscopic_texture:
 *                           type: string
 *                         initial_macroscopic_color:
 *                           type: string
 *                         initial_macroscopic_texture:
 *                           type: string
 *                         initial_macroscopic_symptoms:
 *                           type: string
 *                         initial_macroscopic_characteristics:
 *                           type: string
 *                         initial_microscopic_image_url:
 *                           type: string
 *                           nullable: true
 *                           description: Signed URL for microscopic image. Valid for 2 hours.
 *                         initial_macroscopic_image_url:
 *                           type: string
 *                           nullable: true
 *                           description: Signed URL for macroscopic image. Valid for 2 hours.
 *                         date_observation:
 *                           type: string
 *                         microscopic_ai_snapshot:
 *                           type: object
 *                           description: AI-generated identification snapshot
 *                         scanned_microscopic_ids:
 *                           type: array
 *                           items:
 *                             type: string
 *                         scanned_macroscopic_ids:
 *                           type: array
 *                           items:
 *                             type: string
 *                     final_verdict:
 *                       type: object
 *                       nullable: true
 *                       description: Final identification verdict by mycologist
 *                       properties:
 *                         moldId:
 *                           type: string
 *                           description: ID of the identified mold
 *                         moldName:
 *                           type: string
 *                           description: Name of the identified mold
 *                         confidence:
 *                           type: number
 *                           description: Confidence score of the identification
 *                         moldipedia_id:
 *                           type: string
 *                           nullable: true
 *                           description: Link to moldipedia article if available
 *                         mycologist_notes:
 *                           type: string
 *                           nullable: true
 *                           description: Additional notes from the reviewing mycologist
 *                         verdict_timestamp:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Timestamp when verdict was finalized
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
 *       403:
 *         description: Forbidden
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
   * GET /api/v1/mold-case/by-report/:id
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
 *                 type: string
 *                 description: JSON-encoded string. Parsed by route middleware before schema validation. For `vivo`: `{"lesion_size": number, "lesion_color": string}`. For `vitro`: `{"colony_diameter": number, "colony_color": string}`.
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
 *                       description: Signed URL. Valid for 2 hours.
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Mold case not found
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
   * POST /api/v1/mold-case/:id/logs
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
 *     description: |
 *       Updates cultivation details on a mold case using deep-merge semantics.
 *
 *       Side effect: if the linked MoldReport contains `reported_symptoms`, `reported_signs`, or `reported_characteristics`, a background mold lookup is re-run after this update. Characteristics from `in_vivo_details.lesion_color` and `in_vitro_details.colony_color` and any available microscopic identification names from initial/in vivo/in vitro observations are appended to the lookup inputs. On completion, `lookup_results` on the MoldReport is updated and `cultivation_details.microscopic_ai_snapshot` on this case is overwritten with the top lookup result.
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
 *                 description: Merged with existing cultivation_details in Firestore. Nested objects (in_vivo_details, in_vitro_details, initial_observations, microscopic_ai_snapshot) are deep-merged, not replaced.
 *                 properties:
 *                   growth_medium:
 *                     type: string
 *                   in_vivo_details:
 *                     type: object
 *                     properties:
 *                       environmental_temperature:
 *                         type: number
 *                   in_vitro_details:
 *                     type: object
 *                     properties:
 *                       incubation_temperature:
 *                         type: number
 *                   specimen_types:
 *                     type: array
 *                     items:
 *                       type: string
 *                   specimen_quantities:
 *                     type: array
 *                     items:
 *                       type: string
 *                   initial_symptoms:
 *                     type: array
 *                     items:
 *                       type: string
 *                   initial_characteristics:
 *                     type: array
 *                     items:
 *                       type: string
 *                   location_gathered:
 *                     type: string
 *                   initial_microscopic:
 *                     type: string
 *                     description: If provided and `microscopic_ai_snapshot.identified_mold` is absent, this value is copied into the snapshot as a fallback.
 *                   initial_macroscopic:
 *                     type: string
 *                   initial_microscopic_image_url:
 *                     type: string
 *                   initial_macroscopic_image_url:
 *                     type: string
 *                   date_observation:
 *                     type: string
 *                   microscopic_ai_snapshot:
 *                     type: object
 *                     description: AI-generated identification snapshot.
 *                   scanned_microscopic_ids:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Deduplicated on write.
 *                   scanned_macroscopic_ids:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Deduplicated on write.
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
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
 *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Mold case not found
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
   * PATCH /api/v1/mold-case/:caseId/cultivation-details
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
    const normalizedCultivationDetails =
      (details?.cultivation_details ?? details ?? {}) as Record<string, any>;

    const initialMicroscopic =
      typeof normalizedCultivationDetails.initial_microscopic === "string" ?
        normalizedCultivationDetails.initial_microscopic.trim() :
        "";

    if (!normalizedCultivationDetails.microscopic_ai_snapshot && initialMicroscopic) {
      normalizedCultivationDetails.microscopic_ai_snapshot = {
        identified_mold: initialMicroscopic,
        model_source: "fallback_from_initial_microscopic",
        captured_at: new Date().toISOString(),
      };
    } else if (normalizedCultivationDetails.microscopic_ai_snapshot && initialMicroscopic) {
      const snapshot = normalizedCultivationDetails.microscopic_ai_snapshot as Record<string, any>;
      if (!snapshot.identified_mold || String(snapshot.identified_mold).trim().length === 0) {
        snapshot.identified_mold = initialMicroscopic;
      }
    }

    const normalizedDetails = details?.cultivation_details ?
      {...details, cultivation_details: normalizedCultivationDetails} :
      normalizedCultivationDetails;

    const updated = await updateCultivationDetailsInCase(caseId, normalizedDetails);
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
        const detailsPayload = normalizedCultivationDetails;
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

        const reportedMoldNames: string[] = [];

        if (initialMicroscopic) {
          reportedMoldNames.push(initialMicroscopic);
        }

        const snapshotIdentified = (detailsPayload.microscopic_ai_snapshot as any)?.identified_mold;
        if (typeof snapshotIdentified === "string" && snapshotIdentified.trim()) {
          reportedMoldNames.push(snapshotIdentified.trim());
        }

        const inVivoIdentified = detailsPayload.in_vivo_details?.identified_mold;
        if (typeof inVivoIdentified === "string" && inVivoIdentified.trim()) {
          reportedMoldNames.push(inVivoIdentified.trim());
        }

        const inVitroIdentified = detailsPayload.in_vitro_details?.identified_mold;
        if (typeof inVitroIdentified === "string" && inVitroIdentified.trim()) {
          reportedMoldNames.push(inVitroIdentified.trim());
        }

        const allCharacteristics = [...reportedCharacteristics, ...additionalCharacteristics];

        // Run lookup in background
        performMoldLookup(reportedSymptoms, reportedSigns, allCharacteristics, reportedMoldNames)
          .then(async (lookupResults) => {
            try {
              await updateMoldReportInFirestore(moldCase.mold_report_id, {
                lookup_results: lookupResults.map((r) => ({
                  ...r,
                  timestamp: Timestamp.now(),
                })),
              });

              if (lookupResults.length > 0) {
                const topResult = lookupResults[0] as Record<string, any>;
                const confidenceRaw = topResult.confidence;
                const confidenceValue =
                  typeof confidenceRaw === "number" ?
                    confidenceRaw :
                    Number(confidenceRaw);
                const normalizedConfidence =
                  Number.isFinite(confidenceValue) ? confidenceValue : null;
                const confidenceDisplay =
                  normalizedConfidence === null ?
                    "" :
                    `${normalizedConfidence <= 1 ? (normalizedConfidence * 100).toFixed(1) : normalizedConfidence.toFixed(1)}%`;

                await updateCultivationDetailsInCase(caseId, {
                  cultivation_details: {
                    microscopic_ai_snapshot: {
                      identified_mold:
                        topResult.moldName ||
                        topResult.mold_name ||
                        topResult.identified_mold ||
                        "",
                      mold_id:
                        topResult.moldId ||
                        topResult.mold_id ||
                        "",
                      confidence: normalizedConfidence,
                      confidence_display: confidenceDisplay,
                      model_source: "lookup_refresh",
                      captured_at: new Date().toISOString(),
                      top_predictions: lookupResults,
                    },
                  },
                });
              }

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
   * POST /api/v1/mold-case/:id/analyze-cultivation
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
 * /api/v1/mold-case/search:
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
 * @route GET /api/v1/mold-case/counts/metadata
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
   *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
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
   *       403:
   *         description: Forbidden
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
 *                             description: Signed URL. Valid for 2 hours.
   *                           characteristics:
   *                             type: object
   *                           additional_info:
   *                             type: string
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
 *       403:
 *         description: Forbidden
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
   *       403:
   *         description: Forbidden
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
 * /api/v1/mold-case/{id}/verdict:
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
 *                 description: Also accepted as `mold_id`.
 *               mold_id:
 *                 type: string
 *                 description: Alias for `moldId`.
 *               moldName:
 *                 type: string
 *                 description: Also accepted as `mold_name`.
 *               mold_name:
 *                 type: string
 *                 description: Alias for `moldName`.
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               mycologist_notes:
 *                 type: string
 *             required:
 *               - confidence
 *             description: At least one of `moldId`/`mold_id` and one of `moldName`/`mold_name` must be provided.
 *     responses:
 *       200:
 *         description: Verdict finalized. The mold case is archived (`is_archived: true`) and the linked MoldReport status is set to `resolved`. If the report update fails (e.g., report not in `in progress` status), the verdict is still saved and `report_sync_warning` will contain a non-null description of the failure.
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
 *                     report_owner_id:
 *                       type: string
 *                       nullable: true
 *                     case_name:
 *                       type: string
 *                     final_verdict:
 *                       type: object
 *                       properties:
 *                         moldId:
 *                           type: string
 *                         moldName:
 *                           type: string
 *                         confidence:
 *                           type: number
 *                         mycologist_notes:
 *                           type: string
 *                           nullable: true
 *                         verdict_timestamp:
 *                           type: string
 *                           format: date-time
 *                     report_sync_warning:
 *                       type: string
 *                       nullable: true
 *                       description: Non-null when the linked MoldReport could not be updated to `resolved` status. The verdict itself was still saved successfully.
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Mold case not found
 *       500:
 *         description: Server error
 */
export const finalizeVerdict = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const {
      moldId,
      moldName,
      moldipedia_id: providedMoldipediaId,
      confidence,
      mycologist_notes: mycologistNotes,
    } = req.body;

    // Validate required fields
    // moldId is now optional to support verdicts for predicted classes not in the database
    // moldId will be null when verdict is for a mold not in the database (fallback to predicted_class_name)
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
    let matchedWikiMold: any = null;
    let matchedWikiMoldId: string | undefined =
      typeof providedMoldipediaId === "string" && providedMoldipediaId.trim()
        ? providedMoldipediaId.trim()
        : undefined;
    try {
      if (!matchedWikiMoldId && moldName && moldName.trim()) {
        const moldipediaResponse = await retrieveAllMoldipedia(10, undefined, moldName.trim());
        const candidates = moldipediaResponse?.snapshot || [];
        if (Array.isArray(candidates) && candidates.length > 0) {
          matchedWikiMold = candidates[0];
          matchedWikiMoldId = (matchedWikiMold as any)?.id;
        }
      }
    } catch (matchErr) {
      devLog(`[finalizeVerdict] WikiMold lookup failed: ${matchErr}`);
    }

    // moldId may be null for verdicts from predicted classes not in the database
    const verdict: any = {
      moldId: moldId ?? null,
      moldName,
      confidence,
      verdict_timestamp: Timestamp.now(),
      ...(mycologistNotes !== undefined ? {mycologist_notes: mycologistNotes} : {}),
      ...(matchedWikiMoldId ? {moldipedia_id: matchedWikiMoldId} : {}),
    };

    const updatedCase = await updateMoldCaseInFirestore(caseId, {
      final_verdict: verdict,
      is_archived: true,
      end_date: moldCase.end_date || Timestamp.now(),
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
      matched_wikimold: matchedWikiMold,
    });
  } catch (error) {
    devLog("[finalizeVerdict] Error:", String(error));
    return defaultError(res);
  }
};

export const getMoldCasesByMoldipediaId = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}/cases:
   *   get:
   *     summary: List mold cases linked to a moldipedia article
   *     tags: [Moldipedia, MoldCases]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: List of mold cases
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/MoldCase'
   *       404:
   *         description: No cases found
   *       500:
   *         description: Server error
   */
  try {
    const {id} = req.params;
    const includeEvidence = ["1", "true", "yes", "on"].includes(
      String(req.query.includeEvidence || "").toLowerCase()
    );

    const cases = await retrieveMoldCasesByMoldipediaId(id);
    if (!cases) {
      return sendError(res, "No cases found for this moldipedia article", 404);
    }

    const toMillis = (value: any): number => {
      if (!value) return 0;
      if (value instanceof Timestamp) return value.toDate().getTime();
      if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate().getTime();
      }
      if (typeof value === "object" && typeof value._seconds === "number") {
        return value._seconds * 1000;
      }
      if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return 0;
    };

    const normalizeLogType = (value: unknown): string =>
      String(value || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const toTextList = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((item) => String(item || "").trim())
          .filter((item) => item.length > 0);
      }

      const text = String(value || "").trim();
      return text.length > 0 ? [text] : [];
    };

    const sortedCases = [...cases].sort((a: any, b: any) => {
      const aVerdict = toMillis(a?.final_verdict?.verdict_timestamp);
      const bVerdict = toMillis(b?.final_verdict?.verdict_timestamp);
      if (aVerdict !== bVerdict) return bVerdict - aVerdict;

      const aCreated = toMillis(a?.metadata?.created_at);
      const bCreated = toMillis(b?.metadata?.created_at);
      return bCreated - aCreated;
    });

    if (!includeEvidence) {
      return sendSuccess(res, sortedCases);
    }

    const enrichedCases = await Promise.all(
      sortedCases.map(async (entry: any) => {
        const caseId = String(entry?.id || "").trim();

        let logs: any[] = [];
        if (caseId.length > 0) {
          const logsResult = await getCultivationLogsFromCase(caseId, 50);
          logs = Array.isArray(logsResult?.snapshot) ? logsResult!.snapshot : [];
        }

        const latestByType = (type: "vivo" | "vitro") => {
          const matches = logs
            .filter((log: any) => {
              const normalized = normalizeLogType(log?.type);
              if (type === "vivo") return normalized === "vivo" || normalized === "invivo";
              return normalized === "vitro" || normalized === "invitro";
            })
            .sort((a: any, b: any) => {
              const aTs = toMillis(a?.created_at ?? a?.metadata?.created_at);
              const bTs = toMillis(b?.created_at ?? b?.metadata?.created_at);
              return bTs - aTs;
            });

          return matches.length > 0 ? matches[0] : null;
        };

        const initial = (entry?.cultivation_details && typeof entry.cultivation_details === "object")
          ? entry.cultivation_details
          : {};

        const initialSummary = {
          symptoms: toTextList(initial.initial_symptoms || initial.initial_macroscopic_symptoms),
          characteristics: toTextList(initial.initial_characteristics || initial.initial_macroscopic_characteristics),
          microscopic: String(initial.initial_microscopic || "").trim(),
          macroscopic: String(initial.initial_macroscopic || "").trim(),
        };

        const vivo = latestByType("vivo");
        const vitro = latestByType("vitro");

        const evidenceSummary = {
          initial: initialSummary,
          in_vivo: {
            characteristics: (vivo?.characteristics && typeof vivo.characteristics === "object") ? vivo.characteristics : {},
            observed_at: vivo?.created_at ?? vivo?.metadata?.created_at ?? null,
          },
          in_vitro: {
            characteristics: (vitro?.characteristics && typeof vitro.characteristics === "object") ? vitro.characteristics : {},
            observed_at: vitro?.created_at ?? vitro?.metadata?.created_at ?? null,
          },
          rationale_notes: String(entry?.final_verdict?.mycologist_notes || "").trim() || null,
          threshold: {
            type: "global",
            value: 70,
          },
        };

        return {
          ...entry,
          cultivation_logs: logs,
          evidence_summary: evidenceSummary,
        };
      })
    );

    return sendSuccess(res, enrichedCases);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
