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
      occupation,
    }: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      address: string;
      phoneNumber?: string;
      occupation?: string;
    } = req.body;
    const process: ApiResponse<string> = await registerUser(
      username,
      email,
      password,
      firstName,
      lastName,
      address,
      phoneNumber,
      undefined,
      occupation
    );
    if (!process.success) {
      devLog(process, "REGISTER_USER");
      return sendError(res, process.error, 400);
    }
    return sendSuccess(res, process.data);
  } catch (error) {
    devLog(error, "REGISTER_USER");
    return defaultError(res);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const username: string = req.body.username;
    const password: string = req.body.password;

    const token: string | null = await identifyUser(username, password);
    if (!token) return sendError(res, "Incorrect credentials");

    // Get device type from request (query param, header, or User-Agent)
    const deviceType = (req as any).deviceType;

    const cookie: string | null = await authenticateUser(token, deviceType);
    if (!cookie) return sendError(res, "Your role is not permitted to access this application", 403);

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
export const oAuth = async (req: Request, res: Response) => {
  try {
    const token: string = req.body.token;
    const deviceType = (req as any).deviceType;

    devLog(`🔵 OAuth flow started: deviceType='${deviceType}'`);

    const uid: string | null = await identifyOAuthUser(token);
    if (!uid) {
      devLog("❌ OAuth: Failed to identify user from token");
      return sendError(res, "Something went wrong identifying user.");
    }
    devLog(`✅ OAuth: Identified user with UID=${uid}`);

    const process: ApiResponse<string> = await registerOAuthUser(uid);
    if (!process.success) {
      devLog(`❌ OAuth: Failed to register user: ${process.error}`);
      return sendError(res, "Something went wrong registering user.");
    }
    devLog(`✅ OAuth: User registration successful: ${process.data}`);

    const cookie: string | null = await authenticateUser(token, deviceType);
    if (!cookie) {
      devLog("❌ OAuth: Authentication failed - likely role/device access issue");
      return sendError(res, "Your role is not permitted to access this application", 403);
    }
    devLog("✅ OAuth: Authentication successful, session cookie created");

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
 * @access Public
 */
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const sessionCookie: string | undefined = req.cookies?.session;
    let idToken: string | undefined;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      idToken = req.headers.authorization.split(" ")[1];
    }

    if (!sessionCookie && !idToken) {
      return sendError(res, "Not authenticated", 401);
    }

    const process = await logoutUserSession(sessionCookie, idToken);
    if (!process) throw new Error("Unable to verify token");

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

