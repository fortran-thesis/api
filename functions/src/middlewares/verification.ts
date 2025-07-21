import { Request, Response, NextFunction } from "express";
import { verifyCookie, verifyToken } from "../lib/auth"; // or wherever you export your auth instance
import { Role } from "../types/enums";
import { sendError } from "../utils/response";
import { devLog } from "../utils/dev";

/**
 * Express middleware to verify a user's Bearer token and required role.
 * Returns 401 if no/invalid token, 403 if role is insufficient.
 * @param requiredRole - The required user role for this route
 * @returns Express middleware function
 */
const verifyUserToken =
  (requiredRole?: Role) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        sendError(res, "Unauthorized", 401);
        return;
      }

      const idToken = authHeader.split(" ")[1];
      const role = await verifyToken(idToken);
      if (
        !role ||
        (requiredRole && role !== requiredRole && role !== Role.ADMIN)
      ) {
        sendError(res, "Forbidden", 403);
        return;
      }

      next();
    } catch (error) {
      devLog(error);
      sendError(res, "Something went wrong.", 500);
      return;
    }
  };

/**
 * Express middleware to verify a user's session cookie and required role.
 * Returns 401 if no/invalid cookie, 403 if role is insufficient.
 * @param requiredRole - The required user role for this route
 * @returns Express middleware function
 */
const verifyUserCookie =
  (requiredRole?: Role) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionCookie = req.cookies.session;
      if (!sessionCookie) {
        sendError(res, "Unauthorized", 401);
        return;
      }

      const role = await verifyCookie(sessionCookie);
      if (
        !role ||
        (requiredRole && role !== requiredRole && role !== Role.ADMIN)
      ) {
        sendError(res, "Forbidden", 403);
        return;
      }

      next();
      return;
    } catch (error) {
      devLog(error);
      sendError(res, "Something went wrong.", 500);
      return;
    }
  };

export const verifyUser =
  (requiredRole?: Role) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Try token verification
      await verifyUserToken(requiredRole)(req, res, next);
    } else {
      // Try cookie verification
      await verifyUserCookie(requiredRole)(req, res, next);
    }
  };
