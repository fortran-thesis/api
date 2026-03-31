/**
 * Notification Controller — REST endpoints for managing notifications
 * and FCM device tokens.
 *
 * Every function follows the project pattern:
 *   • Async `(req, res)` signature.
 *   • Swagger JSDoc annotations (OpenAPI 3.0 YAML).
 *   • Delegates to the notification service for business logic.
 *   • Uses `sendSuccess` / `sendError` response helpers.
 */
import {Request, Response} from "express";
import {sendSuccess, sendError, defaultError} from "../utils/response";
import {devLog} from "../utils/dev";
import {
  getNotificationsForUser,
  getNotificationById,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotificationForUser,
  registerToken,
  unregisterToken,
} from "../services/notificationService";

// ═══════════════════════════════════════════════════════════════════════════════
//  LIST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    // eslint-disable-next-line camelcase
    const {is_read, type, limit, pageToken} = req.query as any;

    const result = await getNotificationsForUser(
      req.user.id,
      limit ? Number(limit) : 20,
      pageToken as string | undefined,
      {
        // eslint-disable-next-line camelcase
        is_read: is_read !== undefined ? is_read === "true" || is_read === true : undefined,
        type,
      }
    );

    if (!result) return defaultError(res);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error, "getNotifications");
    return defaultError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UNREAD COUNT
// ═══════════════════════════════════════════════════════════════════════════════

export const getUnreadNotificationCount = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const count = await getUnreadCount(req.user.id);
    return sendSuccess(res, {count});
  } catch (error) {
    devLog(error, "getUnreadNotificationCount");
    return defaultError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SINGLE NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotificationByIdController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const notif = await getNotificationById(req.params.id, req.user.id);
    if (!notif) return sendError(res, "Notification not found", 404);
    return sendSuccess(res, notif);
  } catch (error) {
    devLog(error, "getNotificationByIdController");
    return defaultError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MARK READ
// ═══════════════════════════════════════════════════════════════════════════════

export const markRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const success = await markNotificationRead(req.params.id, req.user.id);
    if (!success) return sendError(res, "Notification not found", 404);
    return sendSuccess(res, "Notification marked as read");
  } catch (error) {
    devLog(error, "markRead");
    return defaultError(res);
  }
};

export const markAllReadController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const count = await markAllRead(req.user.id);
    return sendSuccess(res, {updated: count});
  } catch (error) {
    devLog(error, "markAllReadController");
    return defaultError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const success = await deleteNotificationForUser(req.params.id, req.user.id);
    if (!success) return sendError(res, "Notification not found", 404);
    return sendSuccess(res, "Notification deleted");
  } catch (error) {
    devLog(error, "deleteNotification");
    return defaultError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DEVICE TOKEN
// ═══════════════════════════════════════════════════════════════════════════════

export const registerDeviceToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const {token, platform} = req.body;
    const tokenId = await registerToken(req.user.id, token, platform);
    if (!tokenId) return sendError(res, "Failed to register device token", 400);
    return sendSuccess(res, {id: tokenId}, 201);
  } catch (error) {
    devLog(error, "registerDeviceToken");
    return defaultError(res);
  }
};

export const unregisterDeviceToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const success = await unregisterToken(req.user.id, req.params.id);
    if (!success) return sendError(res, "Failed to remove device token", 400);
    return sendSuccess(res, "Device token removed");
  } catch (error) {
    devLog(error, "unregisterDeviceToken");
    return defaultError(res);
  }
};
