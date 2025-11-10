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
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               details:
   *                 type: object
   *                 description: MoldCase DTO. See MoldCase interface for properties.
   *                 properties:
   *                   user_id:
   *                     type: string
   *                   name:
   *                     type: string
   *                   photo_url:
   *                     type: string
   *                   identified_mold:
   *                     type: string
   *                   is_archived:
   *                     type: boolean
   *               photo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successfully created mold folder
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
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
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
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
   *       401:
   *         description: Unauthorized (not a curator)
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
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
   *         name: page
   *         schema:
   *           type: string
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: string
   *         description: Page size
   *     responses:
   *       200:
   *         description: List of archived mold folders
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const uid: string | undefined = req.user?.id;
  try {
    if (!uid) return sendError(res, "Unauthorized", 401);
    const result: PaginatedResult<MoldCase[]> | null = await retrieveAllMoldCasesByUser(uid, limit, true, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mold cases", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
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
   *               details:
   *                 type: object
   *                 description: Mold folder details to update
   *     responses:
   *       200:
   *         description: Successfully updated mold folder
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
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
   *       500:
   *         description: Server error
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
   *       500:
   *         description: Server error
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
 *       404:
 *         description: No mold case found for this report
 *       500:
 *         description: Server error
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
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional cultivation log image
 *     responses:
 *       200:
 *         description: Cultivation log added successfully
 *       400:
 *         description: Failed to add cultivation log
 *       500:
 *         description: Server error
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
 *             description: Cultivation details to update
 *     responses:
 *       200:
 *         description: Cultivation details updated successfully
 *       400:
 *         description: Failed to update cultivation details
 *       500:
 *         description: Server error
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
 *                 description: Cultivation type (vivo or vitro)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Cultivation image to analyze
 *     responses:
 *       200:
 *         description: Image analyzed successfully
 *       400:
 *         description: Invalid cultivation type or no image provided
 *       500:
 *         description: Failed to analyze image
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

