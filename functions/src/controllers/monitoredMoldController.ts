import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MonitoredMold, PaginatedResult} from "../types/types";
import {
  addMonitoredMoldToFirestore,
  retrieveAllMonitoredMolds,
  retrieveMonitoredMoldById,
  updateMonitoredMoldInFirestore,
  removeMonitoredMold,
  softRemoveMonitoredMold,
} from "../services/monitoredMoldService";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";

/**
 * @swagger
 * /api/v1/monitor:
 *   post:
 *     summary: Create a new monitored mold
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Create a new monitored mold with image upload. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully created monitored mold
 *       400:
 *         description: Invalid photo or validation error
 *       500:
 *         description: Server error
 */
export const createMonitoredMold = async (req: Request, res: Response) => {
  try {
    const details: MonitoredMold = req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const filePath = generateStoragePath(StorageFolder.MONITORED_MOLDS, photo.originalname);
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    }
    const mold: MonitoredMold | null = await addMonitoredMoldToFirestore({
      ...details,
      image_url: url,
    });
    if (!mold) return sendError(res, "Failed to create monitored mold", 400);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/monitor:
 *   get:
 *     summary: Get all monitored molds by folder ID
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all monitored molds for a specific folder with pagination. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID to filter by
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
 *         description: List of monitored molds
 *       404:
 *         description: Failed to retrieve monitored molds
 *       500:
 *         description: Server error
 */
export const getAllMonitoredMoldsByFolderId = async (
  req: Request,
  res: Response
) => {
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const folderId: string = req.query.folderId as string;
  try {
    if (!folderId) {
      return sendError(res, "Folder ID is required", 400);
    }
    const molds: PaginatedResult<MonitoredMold[]> | null = await retrieveAllMonitoredMolds(
      folderId,
      limit,
      pageToken
    );
    if (!molds) {
      return sendError(res, "Failed to retrieve monitored molds", 404);
    }
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/monitor/{id}:
 *   get:
 *     summary: Get monitored mold by ID
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific monitored mold by its ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Monitored mold ID
 *     responses:
 *       200:
 *         description: Monitored mold retrieved successfully
 *       404:
 *         description: Monitored mold not found
 *       500:
 *         description: Server error
 */
export const getMonitoredMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: MonitoredMold | null = await retrieveMonitoredMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve monitored mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/monitor/{id}:
 *   patch:
 *     summary: Update monitored mold
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update a monitored mold's details by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Monitored mold ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               details:
 *                 type: object
 *                 description: Monitored mold details to update
 *     responses:
 *       200:
 *         description: Successfully updated monitored mold
 *       400:
 *         description: Validation error
 *       404:
 *         description: Monitored mold not found
 *       500:
 *         description: Server error
 */
export const patchMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<MonitoredMold> = req.body.details;
    const updated = await updateMonitoredMoldInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update monitored mold", 404);
    return sendSuccess(res, "Successfully updated monitored mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/monitor/hard/{id}:
 *   delete:
 *     summary: Hard delete monitored mold
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Permanently delete a monitored mold by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Monitored mold ID
 *     responses:
 *       200:
 *         description: Successfully deleted monitored mold
 *       500:
 *         description: Server error
 */
export const deleteMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMonitoredMold(id);
    return sendSuccess(res, "Successfully deleted monitored mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/monitor/soft/{id}:
 *   delete:
 *     summary: Soft delete monitored mold
 *     tags: [MonitoredMolds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Soft delete a monitored mold by marking it as archived. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Monitored mold ID
 *     responses:
 *       200:
 *         description: Successfully soft deleted monitored mold
 *       500:
 *         description: Server error
 */
export const softDeleteMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMonitoredMold(id);
    return sendSuccess(res, "Successfully soft deleted monitored mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
