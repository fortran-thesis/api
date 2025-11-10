import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {Moldipedia, PaginatedResult, WithId} from "../types/types";
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {
  addMoldipediaToFirestore,
  retrieveAllMoldipedia,
  retrieveMoldipediaById,
  updateMoldipediaInFirestore,
  removeMoldipedia,
  softRemoveMoldipedia,
} from "../services/moldipediaService";

export const createMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia:
   *   post:
   *     summary: Create a new moldipedia article
   *     tags: [Moldipedia]
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
   *             required:
   *               - details
   *               - cover_photo
   *             properties:
   *               details:
   *                 type: string
   *                 description: JSON string of Moldipedia object with properties - title (string), body (string), author_id (string), tags (array of strings)
   *                 example: '{"title":"Understanding Aspergillus","body":"Aspergillus is a genus...","author_id":"user123","tags":["fungi"]}'
   *               cover_photo:
   *                 type: string
   *                 format: binary
   *                 description: Cover photo image file
   *     responses:
   *       200:
   *         description: Successfully created moldipedia article
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MoldipediaResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   */
  try {
  const details: Omit<Moldipedia, "cover_photo"> = req.body.details;
  const photo: Express.Multer.File = req.file as Express.Multer.File;
  const filePath = generateStoragePath(StorageFolder.MOLDIPEDIA, photo.originalname);
  const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) return sendError(res, "Invalid cover photo, please upload a different image.", 400);
    const article: WithId<Moldipedia> | null = await addMoldipediaToFirestore({...details, cover_photo: url});
    if (!article) return sendError(res, "Failed to create moldipedia article", 400);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.ADD_WIKIMOLD, `Created moldipedia: ${details.title}`, article["id"] || "");
    }
    return sendSuccess(res, article);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia:
   *   get:
   *     summary: Get all moldipedia articles
   *     tags: [Moldipedia]
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
   *         description: List of moldipedia articles
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResult'
   *       404:
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   */
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<Moldipedia[]> | null = await retrieveAllMoldipedia(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve moldipedia articles", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldipediaById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}:
   *   get:
   *     summary: Get moldipedia article by ID
   *     tags: [Moldipedia]
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
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: Moldipedia article
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MoldipediaResponse'
   *       404:
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponseError'
   */
  try {
    const id = req.params.id;
    const article: Moldipedia | null = await retrieveMoldipediaById(id);
    if (!article) return sendError(res, "Failed to retrieve moldipedia article", 404);
    return sendSuccess(res, article);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}:
   *   patch:
   *     summary: Update moldipedia article
   *     tags: [Moldipedia]
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
   *         description: Moldipedia article ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               details:
   *                 type: object
   *                 description: Moldipedia details to update
   *     responses:
   *       200:
   *         description: Successfully updated moldipedia article
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    const details: Partial<Moldipedia> = req.body.details;
    const updated = await updateMoldipediaInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update moldipedia article", 404);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.EDIT_WIKIMOLD, `Updated moldipedia: ${id}`, id);
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}:
   *   delete:
   *     summary: Delete moldipedia article
   *     tags: [Moldipedia]
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
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: Successfully deleted moldipedia article
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await removeMoldipedia(id);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.ARCHIVE_WIKIMOLD, `Deleted moldipedia: ${id}`, id);
    }
    return sendSuccess(res, "Successfully deleted moldipedia article");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/soft/{id}:
   *   delete:
   *     summary: Soft delete moldipedia article
   *     tags: [Moldipedia]
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
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted moldipedia article
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await softRemoveMoldipedia(id);
    return sendSuccess(res, "Successfully soft deleted moldipedia article.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
