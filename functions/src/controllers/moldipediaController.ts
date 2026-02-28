import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {Moldipedia, MoldipediaResponse, PaginatedResult, WithId} from "../types/types";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {
  addMoldipediaToFirestore,
  retrieveAllMoldipedia,
  retrieveMoldipediaById,
  updateMoldipediaInFirestore,
  removeMoldipedia,
  softRemoveMoldipedia,
  archiveMoldipedia,
  unarchiveMoldipedia,
  retrieveArchivedMoldipedia,
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
 *                     title:
 *                       type: string
 *                     body:
 *                       type: string
 *                     author_id:
 *                       type: string
 *                     cover_photo:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     mycologist_id:
 *                       type: string
 *                       nullable: true
 *                       description: ID of the mycologist who reviewed/approved this article
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Timestamp when the article was reviewed/approved
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
    const rawDetails = req.body.details;
    // After parseMultipartJson middleware, "details" is promoted to root body;
    // fall back to flat req.body so both form-data and JSON work.
    const details: Omit<Moldipedia, "cover_photo"> =
      typeof rawDetails === "string" ? JSON.parse(rawDetails) : (rawDetails ?? req.body);
    // Auto-populate author_id from the authenticated user if not provided
    const authorId = details.author_id || req.user?.id || "";
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    if (!photo) {
      return sendError(res, "Cover photo is required.", 400);
    }
    const filePath = generateStoragePath(
      StorageFolder.MOLDIPEDIA,
      photo.originalname
    );
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid cover photo, please upload a different image.",
        400
      );
    }
    const article: WithId<Moldipedia> | null = await addMoldipediaToFirestore({
      ...details,
      author_id: authorId,
      cover_photo: url,
    });
    if (!article) {
      return sendError(res, "Failed to create moldipedia article", 400);
    }
    req.auditTargetId = article["id"] || "";
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
   *               type: object
 *               properties:
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
 *                           title:
 *                             type: string
 *                           body:
 *                             type: string
 *                           author:
 *                             type: string
 *                           cover_photo:
 *                             type: string
 *                           tags:
 *                             type: array
 *                             items:
 *                               type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           mycologist_id:
 *                             type: string
 *                             nullable: true
 *                             description: ID of the mycologist who reviewed/approved this article
 *                           approved_at:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: Timestamp when the article was reviewed/approved
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
   *                 error:
   *                   type: string
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   */
  const searchQuery: string | undefined = req.query.search as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<MoldipediaResponse[]> | null =
      await retrieveAllMoldipedia(limit, pageToken, searchQuery);
    if (!result) {
      return sendError(res, "Failed to retrieve moldipedia articles", 404);
    }
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
   *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     body:
 *                       type: string
 *                     author:
 *                       type: string
 *                     cover_photo:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
   *                     updated_at:
   *                       type: string
   *                       format: date-time
   *                     mycologist_id:
   *                       type: string
   *                       nullable: true
   *                       description: ID of the mycologist who reviewed/approved this article
   *                     approved_at:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       description: Timestamp when the article was reviewed/approved
   *       404:
   *         description: Not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   */
  try {
    const id = req.params.id;
    const article: MoldipediaResponse | null = await retrieveMoldipediaById(id);
    if (!article) {
      return sendError(res, "Failed to retrieve moldipedia article", 404);
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     body:
 *                       type: string
 *                     author_id:
 *                       type: string
 *                     cover_photo:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     mycologist_id:
 *                       type: string
 *                       nullable: true
 *                       description: ID of the mycologist who reviewed/approved this article
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Timestamp when the article was reviewed/approved
 *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    // Support both { details: {...} } and flat body formats (after parseMultipartJson, fields are at root)
    const details: Partial<Moldipedia> = req.body.details ?? req.body;

    // Upload new cover photo if provided via multipart/form-data
    const photo = req.file as Express.Multer.File | undefined;
    let coverPhotoUrl: string | undefined;
    if (photo) {
      const filePath = generateStoragePath(StorageFolder.MOLDIPEDIA, photo.originalname);
      coverPhotoUrl = (await uploadFile(filePath, photo.buffer, photo.mimetype)) || undefined;
      if (!coverPhotoUrl) {
        return sendError(res, "Invalid cover photo, please upload a different image.", 400);
      }
    }

    const updateData: Partial<Moldipedia> = {
      ...details,
      ...(coverPhotoUrl && {cover_photo: coverPhotoUrl}),
    };

    const updated = await updateMoldipediaInFirestore(id, updateData);
    if (!updated) {
      return sendError(res, "Failed to update moldipedia article", 404);
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
  try {
    const id: string = req.params.id;
    await removeMoldipedia(id);
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
  try {
    const id: string = req.params.id;
    await softRemoveMoldipedia(id);
    return sendSuccess(res, "Successfully soft deleted moldipedia article.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

// ─── Archive / Unarchive ─────────────────────────────────────────────────────────

export const getAllArchivedMoldipedia = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/archive:
   *   get:
   *     summary: Get all archived moldipedia articles
   *     tags: [Moldipedia]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Returns all moldipedia articles where is_archived is true. Requires Curator role.
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
   *         description: Cursor token for pagination
   *     responses:
   *       200:
   *         description: Paginated list of archived moldipedia articles
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
   *                           title:
   *                             type: string
   *                           body:
   *                             type: string
   *                           author:
   *                             type: string
   *                           cover_photo:
   *                             type: string
   *                           tags:
   *                             type: array
   *                             items:
   *                               type: string
   *                           is_archived:
   *                             type: boolean
   *                             example: true
   *                           created_at:
   *                             type: string
   *                             format: date-time
   *                           updated_at:
   *                             type: string
   *                             format: date-time   *                           mycologist_id:
   *                             type: string
   *                             nullable: true
   *                             description: ID of the mycologist who reviewed/approved this article
   *                           approved_at:
   *                             type: string
   *                             format: date-time
   *                             nullable: true
   *                             description: Timestamp when the article was reviewed/approved   *                     nextPageToken:
   *                       type: string
   *                       nullable: true
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
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as string | undefined;
    const result = await retrieveArchivedMoldipedia(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve archived moldipedia articles", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const archiveMoldipediaArticle = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}/archive:
   *   patch:
   *     summary: Archive a moldipedia article
   *     tags: [Moldipedia]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Sets is_archived to true on the specified article. Requires Curator role.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: Moldipedia article archived successfully
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
   *                     title:
   *                       type: string
   *                     is_archived:
   *                       type: boolean
   *                       example: true
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
    const updated = await archiveMoldipedia(id);
    if (!updated) return sendError(res, "Failed to archive moldipedia article", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const unarchiveMoldipediaArticle = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/moldipedia/{id}/unarchive:
   *   patch:
   *     summary: Restore a moldipedia article from archive
   *     tags: [Moldipedia]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Sets is_archived to false on the specified article. Requires Curator role.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Moldipedia article ID
   *     responses:
   *       200:
   *         description: Moldipedia article restored successfully
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
   *                     title:
   *                       type: string
   *                     is_archived:
   *                       type: boolean
   *                       example: false
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
    const updated = await unarchiveMoldipedia(id);
    if (!updated) return sendError(res, "Failed to unarchive moldipedia article", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
