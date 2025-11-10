import {Request, Response} from "express";
import {envOptions} from "../configs/environment";
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
  logoutUserSession,
} from "../services/authService";
import {devLog} from "../utils/dev";
import {sendError, sendSuccess, defaultError} from "../utils/response";
import {ApiResponse} from "../types/types";
import {getAuth} from "firebase-admin/auth";

/**
 * Register a new user
 *
 * @route POST /api/v1/auth/register
 * @access Public
 */
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
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: Successfully created user
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
 *                   example: "User successfully registered"
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
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      address,
      phoneNumber,
    }: { username: string; email: string; password: string, firstName: string, lastName: string, address: string, phoneNumber?: string } = req.body;
    const process: ApiResponse<string> = await registerUser(
      username,
      email,
      password,
      firstName,
      lastName,
      address,
      phoneNumber
    );
    if (!process.success) throw Error(process.error);
    return sendSuccess(res, process.data);
  } catch (error) {
    devLog(error, "REGISTER_USER");
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
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Incorrect credentials
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
      sameSite: "lax",
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
 *             $ref: '#/components/schemas/TokenRequest'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid OAuth token or registration failed
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
      sameSite: "lax",
      maxAge: envOptions.maxSessionAge,
    });
    return sendSuccess(res, "Successfully logged in!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Logout user — clears the session cookie and revokes refresh tokens if possible
 *
 * @route POST /api/v1/auth/logout
 * @access Public (clears cookie even if user not authenticated)
 */
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     description: Clears the session cookie and revokes refresh tokens if possible
 *     responses:
 *       200:
 *         description: Successfully logged out
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
 *                   example: "Successfully logged out!"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseError'
 */
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const sessionCookie: string | undefined = req.cookies?.session;
    let idToken: string | undefined;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      idToken = req.headers.authorization.split(" ")[1];
    }
    
    const process = logoutUserSession(sessionCookie, idToken)
    if(!process) throw new Error("Unable to verify token")

    // Clear cookie on client
    res.clearCookie("session", {
      httpOnly: true,
      secure: envOptions.isProd ? true : false,
      sameSite: "lax",
      path: "/",
    });
    
    return sendSuccess(res, "Successfully logged out!");
  } catch (error) {
    devLog(error, "LOGOUT_USER");
    return defaultError(res);
  }
};

/**
 * Send verification code to email
 *
 * @route POST /api/v1/auth/send-verification
 * @access Public
 */
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
 *             $ref: '#/components/schemas/EmailRequest'
 *     responses:
 *       200:
 *         description: Verification code sent
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
 *                   example: "Verification code sent to email"
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
export const sendVerificationCodeEmail = async (
  req: Request,
  res: Response
) => {
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
 *             $ref: '#/components/schemas/VerificationCodeRequest'
 *     responses:
 *       200:
 *         description: Verification code valid
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
 *                   description: Verification token
 *       400:
 *         description: Invalid code
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
export const checkVerificationCodeEmail = async (
  req: Request,
  res: Response
) => {
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
 *             $ref: '#/components/schemas/VerifiedChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed
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
 *                   example: "Successfully changed password!"
 *       400:
 *         description: Invalid code
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
export const verifiedChangePassword = async (req: Request, res: Response) => {
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
 *             $ref: '#/components/schemas/TokenRequest'
 *     responses:
 *       200:
 *         description: Username sent
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
 *                   example: "Successfully sent email to show username!"
 *       400:
 *         description: Invalid code
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
export const verifiedForgetUsername = async (req: Request, res: Response) => {
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
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed
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
 *                   example: "Successfully changed password!"
 *       400:
 *         description: Wrong credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseError'
 *       401:
 *         description: Not authenticated
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
export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const email: string | undefined = req.user?.details.email;
    const uid: string | undefined = req.user?.id;
    const oldPassword: string = req.body.oldPassword;
    const newPassword: string = req.body.newPassword;

    if (!email || !uid) {
      return sendError(res, "User not authenticated properly.");
    }
    const correctAuth = await checkUserChangePassword(email, oldPassword);
    if (!correctAuth) return sendError(res, "Wrong credentials");
    await getAuth().updateUser(uid, {password: newPassword});
    return sendSuccess(res, "Successfully changed password!");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
