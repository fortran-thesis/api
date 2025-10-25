import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";

import {MoldCase, PaginatedResult} from "../types/types";
import {uploadFile} from "../lib/storage";
import {
  addMoldCaseToFirestore,
  retrieveAllMoldCasesByUser,
  updateMoldCaseInFirestore,
  removeMoldCase,
  softRemoveMoldCase,
} from "../services/moldCaseService";

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
    const details: Omit<MoldCase, "photo_url" | "is_archived"> = req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const url = await uploadFile(
      "mold_cases",
      photo.originalname,
      photo.buffer,
      photo.mimetype
    );
    if (!url) {
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    }
    const moldCase: MoldCase | null = await addMoldCaseToFirestore({
      ...details,
      photo_url: url,
      is_archived: false,
    });
    if (!moldCase) return sendError(res, "Failed to create mold case", 400);
    return sendSuccess(res, "Successfully created mold case.");
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
    const details: Partial<MoldCase> = req.body.details;
    const updated = await updateMoldCaseInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold case", 404);
    return sendSuccess(res, "Successfully updated mold case.");
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
