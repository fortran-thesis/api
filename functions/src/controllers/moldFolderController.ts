import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";

import { MoldFolder, PaginatedResult } from "../types/types";
import { uploadFile } from "../lib/storage";
import {
  addMoldFolderToFirestore,
  retrieveAllMoldFoldersByUser,
  updateMoldFolderInFirestore,
  removeMoldFolder,
  softRemoveMoldFolder,
} from "../services/moldFolderService";

export const createMoldFolder = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders:
   *   post:
   *     summary: Create a new mold folder
   *     tags: [MoldFolders]
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
   *                 description: MoldFolder DTO. See MoldFolder interface for properties.
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
    const details: Omit<MoldFolder, "photo_url" | "is_archived"> =
      req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const url = await uploadFile(
      "mold_folders",
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
    const moldFolder: MoldFolder | null = await addMoldFolderToFirestore({
      ...details,
      photo_url: url,
      is_archived: false,
    });
    if (!moldFolder) return sendError(res, "Failed to create mold folder", 400);
    return sendSuccess(res, "Successfully created mold folder.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldFolders = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders:
   *   get:
   *     summary: Get all mold folders for a user
   *     tags: [MoldFolders]
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
    const result: PaginatedResult<MoldFolder[]> | null = await retrieveAllMoldFoldersByUser(uid, limit, false, pageToken);
    if (!result) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllArchivedMoldFolders = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/mold-folders/archive:
   *   get:
   *     summary: Get all archived mold folders for a user
   *     tags: [MoldFolders]
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
    const result: PaginatedResult<MoldFolder[]> | null = await retrieveAllMoldFoldersByUser(uid, limit, true, pageToken);
    if (!result) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMoldFolder = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/{id}:
   *   patch:
   *     summary: Update a mold folder
   *     tags: [MoldFolders]
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
    const details: Partial<MoldFolder> = req.body.details;
    const updated = await updateMoldFolderInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold folder", 404);
    return sendSuccess(res, "Successfully updated mold folder.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldFolder = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/{id}:
   *   delete:
   *     summary: Delete mold folder
   *     tags: [MoldFolders]
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
    await removeMoldFolder(id);
    return sendSuccess(res, "Successfully deleted mold folder");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldFolder = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/mold-folders/soft/{id}:
   *   delete:
   *     summary: Soft delete mold folder
   *     tags: [MoldFolders]
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
    await softRemoveMoldFolder(id);
    return sendSuccess(res, "Successfully soft deleted mold folder.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
