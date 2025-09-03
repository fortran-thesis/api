import { Request, Response, NextFunction } from "express";
import { verifyCookie, verifyToken } from "../lib/auth"; // or wherever you export your auth instance
import { Role } from "../types/enums";
import { sendError } from "../utils/response";
import { devLog } from "../utils/dev";
import { findFirestoreUserById } from "../repositories/userRepository";

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
      const user = await verifyToken(idToken);
      if (
        !user?.user.role ||
        (requiredRole &&
          user.user.role !== requiredRole &&
          user.user.role !== Role.ADMIN)
      ) {
        devLog(
          "User role:" + user?.user.role + "\nRequired role:" + requiredRole
        );
        sendError(res, "Forbidden", 403);
        return;
      }

      if (
        requiredRole &&
        requiredRole === user.user.role &&
        user.user.role === Role.CURATOR
      ) {
        const curator = await findFirestoreUserById(user.id);
        if (!curator) throw new Error("Cannot find user.");
        if (!curator.data()?.is_verified) {
          sendError(res, "Curator not verified!", 401);
          return;
        }
      }
      // Attach user info to request
      req.user = user;
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

      const user = await verifyCookie(sessionCookie);
      if (
        !user?.user.role ||
        (requiredRole &&
          user.user.role !== requiredRole &&
          user.user.role !== Role.ADMIN)
      ) {
        devLog(
          "User role:" + user?.user.role + "\nRequired role:" + requiredRole
        );
        sendError(res, "Forbidden", 403);
        return;
      }

      if (
        requiredRole &&
        requiredRole === user.user.role &&
        user.user.role === Role.CURATOR
      ) {
        const curator = await findFirestoreUserById(user.id);
        if (!curator) throw new Error("Cannot find user.");
        if (!curator.data()?.is_verified) {
          sendError(res, "Curator not verified!", 401);
          return;
        }
      }

      // Attach user info to request
      req.user = user;
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
