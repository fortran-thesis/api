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
} from "../services/moldCaseService";
import {analyzeCultivationImage} from "../services/cultivationAnalysisService";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {findAssignedMoldCasesWithSearch} from "../repositories/moldCaseRepository.js";

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
    const moldCase: MoldCase | null = await addMoldCaseToFirestore({
      ...details,
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
    const moldCase = await retrieveMoldCaseByReportId(reportId);
    if (!moldCase) return sendError(res, "No mold case found for this report", 404);
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
 *                     cultivation_logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
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
 *                     cultivation_details:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         growth_medium:
 *                           type: string
 *                         in_vivo_details:
 *                           type: object
 *                         in_vitro_details:
 *                           type: object
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
   * POST /api/v1/mold-cases/:caseId/logs
   * Add a cultivation log entry to a mold case with optional image upload
   */
  try {
    const caseId: string = req.params.id;
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

    const updated = await addCultivationLogToCase(caseId, logData);
    if (!updated) return sendError(res, "Failed to add cultivation log", 400);
    return sendSuccess(res, updated);
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
 *                     cultivation_logs:
 *                       type: array
 *                       items:
 *                         type: object
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
    const details = req.body;
    const updated = await updateCultivationDetailsInCase(caseId, details);
    if (!updated) return sendError(res, "Failed to update cultivation details", 400);
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


    const result = await findAssignedMoldCasesWithSearch(
      mycologistId,
      searchQuery,
      priority,
      limit,
      pageToken
    );

    if (!result) {
      return sendError(res, "Failed to search mold cases", 500);
    }

    // Convert Firestore QuerySnapshot to JSON
    const snapshot = result.snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return sendSuccess(res, {
      snapshot,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
