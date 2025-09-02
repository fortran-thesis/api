import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { PaginatedResult, SystemRequest, WithId } from "../types/types";
import { createLog } from "../utils/logging";
import { AuditAction } from "../types/enums";
import {
  addSystemRequestToFirestore,
  retrieveAllSystemRequests,
  retrieveSystemRequestById,
  updateSystemRequestInFirestore,
  removeSystemRequest,
  softRemoveSystemRequest,
} from "../services/systemRequestService";

export const createSystemRequest = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request:
   *   post:
   *     summary: Create a new system request (feedback or bug report)
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Submit feedback or report a bug. Requires authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SystemRequest'
   *     responses:
   *       200:
   *         description: Successfully created system request
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const details: Omit<SystemRequest, "created_at"> = req.body;
    const request: WithId<SystemRequest> | null = await addSystemRequestToFirestore(details as SystemRequest);
    if (!request) return sendError(res, "Failed to create system request", 400);
    // Audit log
    if (req.user) {
      const { id, user: { role } } = req.user;
      createLog(id, role, AuditAction.PROFILE_UPDATE, `Created system request`, request.id || "unknown");
    }
    return sendSuccess(res, request);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllSystemRequests = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request:
   *   get:
   *     summary: Get all system requests
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve all system requests (feedback and bug reports). Admin only.
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Page size
   *     responses:
   *       200:
   *         description: List of system requests
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const requests: PaginatedResult<SystemRequest[]> | null = await retrieveAllSystemRequests(limit, pageToken);
    if (!requests) return sendError(res, "Failed to retrieve system requests", 404);
    return sendSuccess(res, requests);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getSystemRequestById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request/{id}:
   *   get:
   *     summary: Get system request by ID
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Retrieve a system request by its ID. Admin only.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: System request ID
   *     responses:
   *       200:
   *         description: System request
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const request: SystemRequest | null = await retrieveSystemRequestById(id);
    if (!request) return sendError(res, "Failed to retrieve system request", 404);
    return sendSuccess(res, request);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchSystemRequest = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request/{id}:
   *   patch:
   *     summary: Update system request
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Update a system request by its ID. Admin only.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: System request ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               message:
   *                 type: string
   *                 description: Updated message
   *               type:
   *                 type: string
   *                 enum: [feedback, bug]
   *                 description: Updated type
   *               userId:
   *                 type: string
   *                 description: Updated user ID
   *     responses:
   *       200:
   *         description: Successfully updated system request
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    const details: Partial<SystemRequest> = req.body;
    const updated = await updateSystemRequestInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update system request", 404);
    // Audit log
    if (req.user) {
      const { id: actorId, user: { role } } = req.user;
      createLog(actorId, role, AuditAction.PROFILE_UPDATE, `Updated system request ${id}`, id);
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteSystemRequest = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request/hard/{id}:
   *   delete:
   *     summary: Hard delete system request
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Hard delete a system request by its ID. Admin only.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: System request ID
   *     responses:
   *       200:
   *         description: Successfully deleted system request
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await removeSystemRequest(id);
    // Audit log
    if (req.user) {
      const { id: actorId, user: { role } } = req.user;
      createLog(actorId, role, AuditAction.PROFILE_UPDATE, `Hard deleted system request ${id}`, id);
    }
    return sendSuccess(res, "Successfully deleted system request");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteSystemRequest = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/system-request/soft/{id}:
   *   delete:
   *     summary: Soft delete system request
   *     tags: [SystemRequest]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Soft delete a system request by its ID. Admin only.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: System request ID
   *     responses:
   *       200:
   *         description: Successfully soft deleted system request
   *       500:
   *         description: Server error
   */
  try {
    const id: string = req.params.id;
    await softRemoveSystemRequest(id);
    // Audit log
    if (req.user) {
      const { id: actorId, user: { role } } = req.user;
      createLog(actorId, role, AuditAction.PROFILE_UPDATE, `Soft deleted system request ${id}`, id);
    }
    return sendSuccess(res, "Successfully soft deleted system request.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
