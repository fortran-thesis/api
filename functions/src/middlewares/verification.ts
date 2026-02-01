import {Request, Response, NextFunction} from "express";
import {verifyCookie, verifyToken} from "../lib/auth"; // or wherever you export your auth instance
import {Role} from "../types/enums";
import {sendError} from "../utils/response";
import {devLog} from "../utils/dev";

/**
 * Express middleware to verify a user's Bearer token and required role.
 * Returns 401 if no/invalid token, 403 if role is insufficient.
 * @param requiredRole - The required user role for this route
 * @return Express middleware function
 */
const verifyUserToken =
  (requiredRole?: Role) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          if (!res.headersSent) {
            sendError(res, "Unauthorized", 401);
          }
          return;
        }

        const idToken = authHeader.split(" ")[1];
        const user = await verifyToken(idToken);
        if (!user) {
          if (!res.headersSent) {
            sendError(res, "Unauthorized", 401);
          }
          return;
        }
        if (
          !user?.user.role ||
        (requiredRole &&
          user.user.role !== requiredRole &&
          user.user.role !== Role.ADMIN)
        ) {
          devLog(
            "User role:" + user?.user.role + "\nRequired role:" + requiredRole
          );
          if (!res.headersSent) {
            sendError(res, "Forbidden", 403);
          }
          return;
        }

        // Attach user info to request
        req.user = user;
        next();
      } catch (error) {
        devLog(error, "verifyUserToken error:");
        if (!res.headersSent) {
          sendError(res, "Something went wrong.", 500);
        }
      }
    };

/**
 * Express middleware to verify a user's session cookie and required role.
 * Returns 401 if no/invalid cookie, 403 if role is insufficient.
 * @param requiredRole - The required user role for this route
 * @return Express middleware function
 */
const verifyUserCookie =
  (requiredRole?: Role) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionCookie = req.cookies.session;
        if (!sessionCookie) {
          if (!res.headersSent) {
            sendError(res, "Unauthorized", 401);
          }
          return;
        }

        const user = await verifyCookie(sessionCookie);
        if (!user) {
          if (!res.headersSent) {
            sendError(res, "Unauthorized", 401);
          }
          return;
        }
        if (
          !user?.user.role ||
        (requiredRole &&
          user.user.role !== requiredRole &&
          user.user.role !== Role.ADMIN)
        ) {
          devLog(
            "User role:" + user?.user.role + "\nRequired role:" + requiredRole
          );
          if (!res.headersSent) {
            sendError(res, "Forbidden", 403);
          }
          return;
        }

        // Attach user info to request
        req.user = user;
        next();
        return;
      } catch (error) {
        devLog(error, "verifyUserCookie error:");
        if (!res.headersSent) {
          sendError(res, "Something went wrong.", 500);
        }
      }
    };

export const verifyUser =
  (requiredRole?: Role) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          // Try token verification
          await verifyUserToken(requiredRole)(req, res, next);
        } else {
          // Try cookie verification
          await verifyUserCookie(requiredRole)(req, res, next);
        }
      } catch (error) {
        devLog(error, "verifyUser middleware error:");
        // Make sure we send JSON response, not HTML
        if (!res.headersSent) {
          sendError(res, "Authentication failed", 401);
        }
      }
    };
