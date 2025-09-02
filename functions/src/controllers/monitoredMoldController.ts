import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { MonitoredMold, PaginatedResult } from "../types/types";
import {
  addMonitoredMoldToFirestore,
  retrieveAllMonitoredMolds,
  retrieveMonitoredMoldById,
  updateMonitoredMoldInFirestore,
  removeMonitoredMold,
  softRemoveMonitoredMold,
} from "../services/monitoredMoldService";
import { uploadFile } from "../lib/storage";

export const createMonitoredMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/monitored-molds:
   *   post:
   *     summary: Create a new monitored mold
   *     tags: [MonitoredMolds]
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
   *                 description: MonitoredMold DTO. See MonitoredMold interface for properties.
   *                 properties:
   *                   user_id:
   *                     type: string
   *                   mold_folder_id:
   *                     type: string
   *                   image_url:
   *                     type: string
   *                   uploaded_at:
   *                     type: string
   *                     format: date-time
   *                   image_format:
   *                     type: string
   *                   surface_area:
   *                     type: number
   *               photo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successfully created monitored mold
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const details: MonitoredMold = req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const url = await uploadFile(
      "monitored_molds",
      photo.originalname,
      photo.buffer,
      photo.mimetype
    );
    if (!url)
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
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

export const getAllMonitoredMoldsByFolderId = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/monitored-molds/{id}:
   *   get:
   *     summary: Get all monitored molds by folder ID
   *     tags: [MonitoredMolds]
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
   *         description: Folder ID
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
   *         description: List of monitored molds
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const id: string = req.params.id;
  try {
    const molds: PaginatedResult<MonitoredMold[]> | null = await retrieveAllMonitoredMolds(
      id,
      limit,
      pageToken
    );
    if (!molds)
      return sendError(res, "Failed to retrieve monitored molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMonitoredMoldById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/monitored-molds/{id}:
   *   get:
   *     summary: Get monitored mold by ID
   *     tags: [MonitoredMolds]
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
   *         description: Monitored mold ID
   *     responses:
   *       200:
   *         description: Monitored mold
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
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

export const patchMonitoredMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/monitored-molds/{id}:
   *   patch:
   *     summary: Update monitored mold
   *     tags: [MonitoredMolds]
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
   *         description: Not found
   *       500:
   *         description: Server error
   */
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

export const deleteMonitoredMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/monitored-molds/{id}:
   *   delete:
   *     summary: Delete monitored mold
   *     tags: [MonitoredMolds]
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
   *         description: Monitored mold ID
   *     responses:
   *       200:
   *         description: Successfully deleted monitored mold
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await removeMonitoredMold(id);
    return sendSuccess(res, "Successfully deleted monitored mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMonitoredMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/monitored-molds/soft/{id}:
   *   delete:
   *     summary: Soft delete monitored mold
   *     tags: [MonitoredMolds]
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
   *         description: Monitored mold ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted monitored mold
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await softRemoveMonitoredMold(id);
    return sendSuccess(res, "Successfully soft deleted monitored mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
