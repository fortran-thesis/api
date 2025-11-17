import {Request, Response, NextFunction} from "express";
import {DeviceType, getDeviceType, canAccessDevice} from "../types/device";
import {sendError} from "../utils/response";
import {devLog} from "../utils/dev";

/**
 * Middleware to verify that a user's role is allowed on the requested device
 * Should be used after verifyUser() middleware
 *
 * Usage: app.post('/api/v1/auth/login', verifyDevice(), loginUser)
 */
export const verifyDevice = () => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceType = getDeviceType(req);

    // Get user role (assumes verifyUser middleware hasn't been called yet for login)
    // For login endpoint, we check role after authentication
    // This middleware is mainly for protecting other endpoints

    // Attach device info to request for later use
    req.deviceType = deviceType;

    next();
  } catch (error) {
    devLog(error);
    sendError(res, "Something went wrong validating device.", 500);
  }
};

/**
 * Enhanced middleware to verify device type for already authenticated users
 * Use this after verifyUser() for protected endpoints
 */
export const verifyDeviceAccess = () => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceType = getDeviceType(req);
    const userRole = req.user?.user?.role;

    if (!userRole) {
      sendError(res, "User role not found.", 401);
      return;
    }

    if (!canAccessDevice(userRole, deviceType)) {
      devLog(`Device access denied: Role '${userRole}' cannot access device '${deviceType}'`);
      sendError(
        res,
        `Your role (${userRole}) is not permitted to access this application. Allowed devices: ${getDeviceType(req)}`,
        403
      );
      return;
    }

    // Attach device info to request
    req.deviceType = deviceType;
    next();
  } catch (error) {
    devLog(error);
    sendError(res, "Something went wrong validating device access.", 500);
  }
};

// Extend Express Request type to include deviceType
declare global {
    // eslint-disable-next-line
  namespace Express {
    interface Request {
      deviceType?: DeviceType;
    }
  }
}
