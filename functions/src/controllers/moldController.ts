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
import {createLog} from "../utils/logging";
import {AuditAction} from "../types/enums";

export const createMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds:
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
   *             properties:
   *               details:
   *                 type: object
   *                 description: Mold DTO. See Mold interface for properties.
   *                 properties:
   *                   name:
   *                     type: string
   *                   description:
   *                     type: string
   *                   growth_stage:
   *                     type: string
   *               photos:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Successfully created mold
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const moldName: string = req.body.moldName
    const details: MoldDetails = req.body.details;
    const mold: WithId<Mold> | null = await addMoldToFirestore({name: moldName, mold_details: details});
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.ADD_MOLD, `Created mold: ${moldName}`, mold.id || "");
    }
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMolds = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds:
   *   get:
   *     summary: Get all molds
   *     tags: [Molds]
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
   *         description: List of molds
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
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

export const getMoldById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds/{id}:
   *   get:
   *     summary: Get mold by ID
   *     tags: [Molds]
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
   *         description: Mold ID
   *     responses:
   *       200:
   *         description: Mold
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
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

export const getMoldByName = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds/name/{name}:
   *   get:
   *     summary: Get mold by name
   *     tags: [Molds]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: name
   *         required: true
   *         schema:
   *           type: string
   *         description: Mold name
   *     responses:
   *       200:
   *         description: Mold
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
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

export const patchMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds/{id}:
   *   patch:
   *     summary: Update mold
   *     tags: [Molds]
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
   *                 description: Mold details to update
   *     responses:
   *       200:
   *         description: Successfully updated mold
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    const details: Mold = req.body.details;
    const mold = await updateMoldInFirestore(id, details);
    if (!mold) return sendError(res, "Failed to update mold", 404);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.EDIT_MOLD, `Updated mold: ${id}`, id);
    }
    return sendSuccess(res, "Successfully updated mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds/{id}:
   *   delete:
   *     summary: Delete mold
   *     tags: [Molds]
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
   *         description: Mold ID
   *     responses:
   *       200:
   *         description: Successfully deleted mold
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await removeMold(id);
    // Audit log
    if (req.user) {
      createLog(req.user.id, req.user.user.role, AuditAction.EDIT_MOLD, `Soft deleted mold: ${id}`, id);
    }
    return sendSuccess(res, "Successfully deleted mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMold = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/molds/soft/{id}:
   *   delete:
   *     summary: Soft delete mold
   *     tags: [Molds]
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
   *         description: Mold ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted mold
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await softRemoveMold(id);
    return sendSuccess(res, "Successfully soft deleted mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
