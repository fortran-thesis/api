import { Request, Response } from "express";
import { removeUser, updateUser } from "../services/authService";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import {
  retrieveAllUsers,
  retrieveUserByEmail,
  retrieveUserById,
} from "../services/userService";

export const getUserById = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Requires authentication (Bearer token or session cookie)
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const user = await retrieveUserById(id);
    if (!user) return sendError(res, "Failed to retrieve user", 404);
    return sendSuccess(res, user);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getUserByEmail = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/users/email/{email}:
   *   get:
   *     summary: Get user by email
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *         description: User email
   *    security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Requires authentication (Bearer token or session cookie)
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  try {
    const email = req.params.email;
    const user = await retrieveUserByEmail(email);
    if (!user) return sendError(res, "Failed to retrieve user", 404);
    return sendSuccess(res, user);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     summary: Get all users (admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Requires authentication (Bearer token or session cookie) and admin role.
   *     responses:
   *       200:
   *         description: List of users
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Server error
   */
  //TODO: pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  try {
    const users = await retrieveAllUsers(limit, offset);
    return sendSuccess(res, users);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/users/{id}:
   *   patch:
   *     summary: Update user details
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Requires authentication (Bearer token or session cookie)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               details:
   *                 type: object
   *                 description: User details to update
   *     responses:
   *       200:
   *         description: Successfully updated user
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    const details = req.body.details;
    const updated = await updateUser(id, details);
    if (!updated)
      return sendError(res, "Failed to update user. Try again later");
    return sendSuccess(res, "Successfully updated user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/users/{id}:
   *   delete:
   *     summary: Delete user (admin only)
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description: Requires authentication (Bearer token or session cookie) and admin role.
   *     responses:
   *       200:
   *         description: Successfully deleted user
   *       403:
   *         description: Forbidden
   *       500:
   *         description: Server error
   */
  try {
    const id = req.params.id;
    await removeUser(id);
    return sendSuccess(res, "Successfully deleted user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
