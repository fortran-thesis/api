import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {
  addMoldToFirestore,
  removeMold,
  retrieveAllMolds,
  retrieveMoldById,
  retrieveMoldByName,
  softRemoveMold,
  updateMoldInFirestore,
} from "../services/moldService";
import {Mold, MoldDetails, PaginatedResult, WithId} from "../types/types";

/**
 * @swagger
 * /api/v1/mold:
 *   post:
 *     summary: Create a new mold
 *     tags: [Molds]
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
 *               - moldName
 *               - details
 *             properties:
 *               moldName:
 *                 type: string
 *                 description: Name of the mold
 *               details:
 *                 type: object
 *                 description: Mold details including info and prevention
 *                 properties:
 *                   info:
 *                     type: object
 *                     properties:
 *                       description:
 *                         type: string
 *                       taxonomy:
 *                         type: object
 *                         properties:
 *                           kingdom:
 *                             type: string
 *                           phylum:
 *                             type: string
 *                           class:
 *                             type: string
 *                           order:
 *                             type: string
 *                           family:
 *                             type: string
 *                           genus:
 *                             type: string
 *                       additional_info:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *                   prevention:
 *                     type: object
 *                     properties:
 *                       fungicide:
 *                         type: array
 *                         items:
 *                           type: string
 *                       additional_info:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                             description:
 *                               type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Successfully created mold
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
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                               properties:
 *                                 kingdom:
 *                                   type: string
 *                                 phylum:
 *                                   type: string
 *                                 class:
 *                                   type: string
 *                                 order:
 *                                   type: string
 *                                 family:
 *                                   type: string
 *                                 genus:
 *                                   type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   title:
 *                                     type: string
 *                                   description:
 *                                     type: string
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   title:
 *                                     type: string
 *                                   description:
 *                                     type: string
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
 *         description: Failed to create mold
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
export const createMold = async (req: Request, res: Response) => {
  try {
    const moldName: string = req.body.moldName;
    const details: MoldDetails = req.body.details;
    const mold: WithId<Mold> | null = await addMoldToFirestore({name: moldName, mold_details: details});
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    req.auditTargetId = mold.id || "";
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold:
 *   get:
 *     summary: Get all molds
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve all molds with pagination. Requires curator role.
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
 *         description: List of molds
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
 *                           name:
 *                             type: string
 *                           mold_details:
 *                             type: object
 *                             properties:
 *                               info:
 *                                 type: object
 *                               prevention:
 *                                 type: object
 *                     nextPageToken:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Failed to retrieve molds
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
export const getAllMolds = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<Mold[]> | null = await retrieveAllMolds(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/{id}:
 *   get:
 *     summary: Get mold by ID
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold by its ID. Requires curator role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Mold retrieved successfully
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
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *       404:
 *         description: Mold not found
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
export const getMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: Mold | null = await retrieveMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/name/{name}:
 *   get:
 *     summary: Get mold by name
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve a specific mold by its name. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold name
 *     responses:
 *       200:
 *         description: Mold retrieved successfully
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
 *                     name:
 *                       type: string
 *                     mold_details:
 *                       type: object
 *                       properties:
 *                         info:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             taxonomy:
 *                               type: object
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         prevention:
 *                           type: object
 *                           properties:
 *                             fungicide:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             additional_info:
 *                               type: array
 *                               items:
 *                                 type: object
 *       404:
 *         description: Mold not found
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
export const getMoldByName = async (req: Request, res: Response) => {
  try {
    const name: string = req.params.name;
    const mold: Mold | null = await retrieveMoldByName(name);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/{id}:
 *   patch:
 *     summary: Update mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Update a mold's details by ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               details:
 *                 type: object
 *                 description: Mold details to update (partial)
 *                 properties:
 *                   name:
 *                     type: string
 *                   mold_details:
 *                     type: object
 *                     properties:
 *                       info:
 *                         type: object
 *                       prevention:
 *                         type: object
 *     responses:
 *       200:
 *         description: Successfully updated mold
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
 *                   example: "Successfully updated mold."
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
 *         description: Mold not found
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
export const patchMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Mold = req.body.details;
    const mold = await updateMoldInFirestore(id, details);
    if (!mold) return sendError(res, "Failed to update mold", 404);
    return sendSuccess(res, "Successfully updated mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/hard/{id}:
 *   delete:
 *     summary: Hard delete a mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Permanently delete a mold by ID. Requires admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Successfully deleted mold
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
 *                   example: "Successfully deleted mold"
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
export const deleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMold(id);
    return sendSuccess(res, "Successfully deleted mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/mold/soft/{id}:
 *   delete:
 *     summary: Soft delete a mold
 *     tags: [Molds]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Soft delete a mold by marking it as archived. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mold ID
 *     responses:
 *       200:
 *         description: Successfully soft deleted mold
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
 *                   example: "Successfully soft deleted mold."
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
export const softDeleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMold(id);
    return sendSuccess(res, "Successfully soft deleted mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


