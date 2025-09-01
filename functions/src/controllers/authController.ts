import { Request, Response } from "express";
import { envOptions } from "../configs/environment";
import {
  registerUser,
  authenticateUser,
  changePassword,
  identifyUser,
  identifyOAuthUser,
  registerOAuthUser,
  sendVerificationCode,
  checkVerificationCode,
  forgetUsername,
  checkUserChangePassword,
} from "../services/authService";
import { devLog } from "../utils/dev";
import { sendError, sendSuccess, defaultError } from "../utils/response";
import { ApiResponse } from "../types/types";
import { getAuth } from "firebase-admin/auth";

/**
 * Register a new user
 *
 * @route POST /api/v1/auth/register
 * @access Public
 */
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
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 format: string
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
    const {
      username,
      email,
      password,
    }: { username: string; email: string; password: string } = req.body;
    const process: ApiResponse<string> = await registerUser(
      username,
      email,
      password
    );
    if (!process.success) return sendError(res, process.error);
    return sendSuccess(res, process.data);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Login user
 *
 * @route POST /api/v1/auth/login
 * @access Public
 */
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email of the user
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       400:
 *         description: Incorrect credentials
 *       500:
 *         description: Server error
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const username: string = req.body.username;
    const password: string = req.body.password;

    const token: string | null = await identifyUser(username, password);
    if (!token) return sendError(res, "Incorrect credentials");
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

/**
 * OAuth2 login/register
 *
 * @route POST /api/v1/auth/oauth
 * @access Public
 */
/**
 * @swagger
 * /api/v1/auth/oauth:
 *   post:
 *     summary: OAuth2 login/register
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
 *                 description: OAuth2 provider token
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       400:
 *         description: Invalid OAuth token or registration failed
 *       500:
 *         description: Server error
 */
export const oAuth = async (req: Request, res: Response) => {
  try {
    const token: string = req.body.token;
    const uid: string | null = await identifyOAuthUser(token);
    if (!uid) return sendError(res, "Something went wrong identifying user.");
    const process: ApiResponse<string> = await registerOAuthUser(uid);
    if (!process.success) return sendError(res, "Something went wrong registering user.");
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

/**
 * Send verification code to email
 *
 * @route POST /api/v1/auth/send-verification
 * @access Public
 */
export const sendVerificationCodeEmail = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/auth/send-verification:
   *   post:
   *     summary: Send verification code to email
   *     tags: [Auth]
   *     description:
   *       - Public endpoint to send verification code.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Verification code sent
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  try {
    const email: string = req.body.email;
    const process = await sendVerificationCode(email);
    return sendSuccess(res, process);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Check verification code
 *
 * @route POST /api/v1/auth/check-verification
 * @access Public
 */
export const checkVerificationCodeEmail = async (
  req: Request,
  res: Response
) => {
  /**
   * @swagger
   * /api/v1/auth/check-verification:
   *   post:
   *     summary: Check verification code
   *     tags: [Auth]
   *     description:
   *       - Public endpoint to check verification code.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - code
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               code:
   *                 type: string
   *     responses:
   *       200:
   *         description: Verification code valid
   *       400:
   *         description: Invalid code
   *       500:
   *         description: Server error
   */
  try {
    const email: string = req.body.email;
    const code: string = req.body.code;
    const token = await checkVerificationCode(email, code);
    if (!token) return sendError(res, "Invalid code!");
    return sendSuccess(res, token);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Change password with verification
 *
 * @route POST /api/v1/auth/verified-change-password
 * @access Public
 */
export const verifiedChangePassword = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/auth/verified-change-password:
   *   post:
   *     summary: Change password with verification
   *     tags: [Auth]
   *     description:
   *       - Public endpoint to change password after verification.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed
   *       400:
   *         description: Invalid code
   *       500:
   *         description: Server error
   */
  try {
    const token: string = req.body.token;
    const newPass: string = req.body.newPassword;
    const process = await changePassword(token, newPass);
    if (!process.success) return sendError(res, "Invalid code!");
    return sendSuccess(res, "Successfully changed password!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Send username to email after verification
 *
 * @route POST /api/v1/auth/verified-forget-username
 * @access Public
 */
export const verifiedForgetUsername = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/auth/verified-forget-username:
   *   post:
   *     summary: Send username to email after verification
   *     tags: [Auth]
   *     description:
   *       - Public endpoint to send username after verification.
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
   *     responses:
   *       200:
   *         description: Username sent
   *       400:
   *         description: Invalid code
   *       500:
   *         description: Server error
   */
  try {
    const token: string = req.body.token;
    const process = await forgetUsername(token);
    if (!process.success) return sendError(res, "Invalid code!");
    return sendSuccess(res, "Successfully sent email to show username!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Change password (authenticated)
 *
 * @route POST /api/v1/auth/change-password
 * @access Authenticated users
 */
export const changeUserPassword = async (req: Request, res: Response) => {
  /**
   * @swagger
   * /api/v1/auth/change-password:
   *   post:
   *     summary: Change password (authenticated)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     description:
   *       - Requires authentication (Bearer token or session cookie)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed
   *       400:
   *         description: Wrong credentials
   *       401:
   *         description: Not authenticated
   *       500:
   *         description: Server error
   */
  try {
    const email: string | undefined = req.user?.details.email;
    const uid: string | undefined = req.user?.id;
    const oldPassword: string = req.body.oldPassword;
    const newPassword: string = req.body.newPassword;

    if (!email || !uid)
      return sendError(res, "User not authenticated properly.");
    const correctAuth = checkUserChangePassword(email, oldPassword);
    if (!correctAuth) return sendError(res, "Wrong credentials");
    await getAuth().updateUser(uid, { password: newPassword });
    return sendSuccess(res, "Successfully changed password!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
