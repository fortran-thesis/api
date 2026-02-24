import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {PaginatedResult, ScannedMold, WithId} from "../types/types";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {
  addScannedMoldToFirestore,
  retrieveAllScannedMolds,
  retrieveScannedMoldById,
  updateScannedMoldInFirestore,
  removeScannedMold,
  softRemoveScannedMold,
} from "../services/scannedMoldService";

/**
 * @swagger
 * /api/v1/scanned-molds:
 *   post:
 *     summary: Create a new scanned mold
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Create a new scanned mold with image upload. Requires authentication (Bearer token or session cookie).
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully created scanned mold
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
 *                     moldipedia_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     image_url:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
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
export const createScannedMold = async (req: Request, res: Response) => {
  try {
    const details: Omit<ScannedMold, "image_url" | "uploaded_at"> = req.body;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const filePath = generateStoragePath(StorageFolder.SCANNED_MOLDS, photo.originalname);
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    }
    const scanned: WithId<ScannedMold> | null = await addScannedMoldToFirestore(
      details,
      url
    );
    if (!scanned) return sendError(res, "Failed to create scanned mold", 400);
    req.auditTargetId = scanned.id || "";
    return sendSuccess(res, scanned);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/scanned-molds:
 *   get:
 *     summary: Get all scanned molds
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all scanned molds with pagination. Requires authentication (Bearer token or session cookie).
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
 *         description: List of scanned molds
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
 *                           moldipedia_id:
 *                             type: string
 *                           user_id:
 *                             type: string
 *                           image_url:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
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
export const getAllScannedMolds = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const molds: PaginatedResult<ScannedMold[]> | null = await retrieveAllScannedMolds(
      limit,
      pageToken
    );
    if (!molds) return sendError(res, "Failed to retrieve scanned molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/scanned-molds/{id}:
 *   get:
 *     summary: Get scanned mold by ID
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scanned mold ID
 *     responses:
 *       200:
 *         description: Scanned mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export const getScannedMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: ScannedMold | null = await retrieveScannedMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve scanned mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/scanned-molds/{id}:
 *   patch:
 *     summary: Update scanned mold
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scanned mold ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               details:
 *                 type: object
 *                 description: Scanned mold details to update
 *     responses:
 *       200:
 *         description: Successfully updated scanned mold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
export const patchScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<ScannedMold> = req.body;
    const updated = await updateScannedMoldInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update scanned mold", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/scanned-molds/hard/{id}:
 *   delete:
 *     summary: Hard delete scanned mold
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Hard delete a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scanned mold ID
 *     responses:
 *       200:
 *         description: Successfully deleted scanned mold
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
export const deleteScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeScannedMold(id);
    return sendSuccess(res, "Successfully deleted scanned mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/scanned-molds/soft/{id}:
 *   delete:
 *     summary: Soft delete scanned mold
 *     tags: [ScannedMold]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Soft delete a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scanned mold ID
 *     responses:
 *       200:
 *         description: Successfully soft deleted scanned mold
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
export const softDeleteScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveScannedMold(id);
    return sendSuccess(res, "Successfully soft deleted scanned mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


