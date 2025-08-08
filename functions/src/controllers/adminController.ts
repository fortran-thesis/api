import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { banUser, toggleUser } from "../services/adminService";

export const disableUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/admin/disable:
   *   post:
   *     summary: Disable a user
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie) and admin role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: User ID
   *               email:
   *                 type: string
   *                 description: User email
   *     responses:
   *       200:
   *         description: Successfully disabled user
   *       400:
   *         description: Error
   *       500:
   *         description: Server error
   */
  try {
    const id = req.body.id;
    const email = req.body.email;
    const process = await toggleUser(id, email, true);
    if (!process.success) return sendError(res, "Failed to disable user.");
    return sendSuccess(res, "Successfully disabled user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const enableUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/admin/enable:
   *   post:
   *     summary: Enable a user
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie) and admin role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: User ID
   *               email:
   *                 type: string
   *                 description: User email
   *     responses:
   *       200:
   *         description: Successfully enabled user
   *       400:
   *         description: Error
   *       500:
   *         description: Server error
   */
  try {
    const id = req.body.id;
    const email = req.body.email;
    const process = await toggleUser(id, email, false);
    if (!process.success) return sendError(res, "Failed to enable user.");
    return sendSuccess(res, "Successfully enabled user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const banUserController = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/admin/ban:
   *   post:
   *     summary: Ban a user
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie) and admin role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: User ID
   *               email:
   *                 type: string
   *                 description: User email
   *     responses:
   *       200:
   *         description: Successfully banned user
   *       400:
   *         description: Error
   *       500:
   *         description: Server error
   */
  try {
    const id = req.body.id;
    const email = req.body.id;
    const process = await banUser(id, email);
    if (!process.success) return sendError(res, "Failed to ban user.");
    return sendSuccess(res, "Successfully banned user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
