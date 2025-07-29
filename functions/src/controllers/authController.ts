import { Request, Response } from "express";
import { envOptions } from "../configs/environment";
import { registerUser, authenticateUser } from "../services/authService";
import { devLog } from "../utils/dev";
import { sendError, sendSuccess, defaultError } from "../utils/response";
import { ApiResponse } from "../types/types";

export const createUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Successfully created user
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const { email, password }: { email: string; password: string } = req.body;
    const process: ApiResponse<string> = await registerUser(email, password);
    if (!process.success) return sendError(res, process.error);
    return sendSuccess(res, process.data);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     summary: Login a user and set session cookie
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *                 description: Firebase ID token
   *     responses:
   *       200:
   *         description: Successfully logged in
   *       400:
   *         description: Validation error
   *       401:
   *         description: Incorrect credentials
   *       500:
   *         description: Server error
   */
  try {
    const token: string = req.body.token;
    const cookie: string | null = await authenticateUser(token);
    if (!cookie) return sendError(res, "Incorrect credentials");

    res.cookie("session", cookie, {
      httpOnly: true,
      secure: envOptions.isProd ? true : false,
      sameSite: "strict",
      maxAge: envOptions.maxSessionAge,
    });
    return sendSuccess(res, "Successfully logged in!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
