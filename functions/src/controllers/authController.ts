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
    const { username, email, password }: { username: string, email: string; password: string } = req.body;
    const process: ApiResponse<string> = await registerUser(username, email, password);
    if (!process.success) return sendError(res, process.error);
    return sendSuccess(res, process.data);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const username: string = req.body.username;
    const password: string = req.body.password;

    const token: string | null = await identifyUser(username, password);
    if(!token) return sendError(res, 'Incorrect credentials');
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
}

export const oAuth = async (req: Request, res: Response) => {
  try {
    const token: string = req.body.token;
    const uid: string | null = await identifyOAuthUser(token);
    if(!uid) return sendError(res, 'Something went wrong.')
    const process: ApiResponse<string> = await registerOAuthUser(uid);
    if(!process.success) return sendError(res, 'Something went wrong.')
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
}

export const sendVerificationCodeEmail = async (req: Request, res: Response) => {
  try {
    const email: string = req.body.email;
    const process = await sendVerificationCode(email);
    return sendSuccess(res, process);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const checkVerificationCodeEmail = async (req: Request, res: Response) => {
  try {
    const email: string = req.body.email
    const code: string = req.body.code
    const token = await checkVerificationCode(email, code)
    if(!token) return sendError(res, 'Invalid code!');
    return sendSuccess(res, token);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
}

export const verifiedChangePassword = async (req: Request, res: Response) => {
  try {
    const token: string = req.body.token
    const newPass: string = req.body.newPassword
    const process = await changePassword(token, newPass)
    if(!process.success) return sendError(res, 'Invalid code!');
    return sendSuccess(res, 'Successfully changed password!');
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
}

export const verifiedForgetUsername = async (req: Request, res: Response) => {
  try {
    const token: string = req.body.token
    const process = await forgetUsername(token)
    if(!process.success) return sendError(res, 'Invalid code!');
    return sendSuccess(res, 'Successfully sent email to show username!');
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
}

export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const email: string | undefined = req.user?.details.email;
    const uid: string | undefined = req.user?.id
    const oldPassword: string = req.body.oldPassword;
    const newPassword: string = req.body.newPassword;

    if(!email || !uid) return sendError(res, 'User not authenticated properly.')
    const correctAuth = checkUserChangePassword(email, oldPassword)
    if(!correctAuth) return sendError(res, 'Wrong credentials')
    await getAuth().updateUser(uid, {password: newPassword})
    return sendSuccess(res, 'Successfully changed password!')
  } catch (error) {
    devLog(error)
    return defaultError(res)
  }
}