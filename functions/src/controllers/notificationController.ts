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

/**
 * @swagger
 * /api/v1/notification:
 *   get:
 *     summary: Get paginated notifications for the authenticated user
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by read status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "20"
 *         description: Number of results per page
 *       - in: query
 *         name: pageToken
 *         schema:
 *           type: string
 *         description: Token for the next page
 *     responses:
 *       200:
 *         description: Paginated list of notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const {is_read, type, limit, pageToken} = req.query as any;

    const result = await getNotificationsForUser(
      req.user.id,
      limit ? Number(limit) : 20,
      pageToken as string | undefined,
      {
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

/**
 * @swagger
 * /api/v1/notification/unread-count:
 *   get:
 *     summary: Get the number of unread notifications
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCountResponse'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/notification/{id}:
 *   get:
 *     summary: Get a single notification by ID
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification document ID
 *     responses:
 *       200:
 *         description: Notification found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found or not owned by user
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/notification/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification document ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseSuccess'
 *       404:
 *         description: Notification not found or not owned by user
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/notification/read-all:
 *   patch:
 *     summary: Mark all notifications as read for the authenticated user
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseSuccess'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/notification/{id}:
 *   delete:
 *     summary: Soft-delete a notification
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification document ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseSuccess'
 *       404:
 *         description: Notification not found or not owned by user
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/notification/device-token:
 *   post:
 *     summary: Register an FCM device token for push notifications
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDeviceTokenRequest'
 *     responses:
 *       200:
 *         description: Device token registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export const registerDeviceToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const {token, platform} = req.body;
    const tokenId = await registerToken(req.user.id, token, platform);
    if (!tokenId) return sendError(res, "Failed to register device token", 400);
    return sendSuccess(res, {id: tokenId});
  } catch (error) {
    devLog(error, "registerDeviceToken");
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/notification/device-token/{id}:
 *   delete:
 *     summary: Unregister an FCM device token
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device token document ID
 *     responses:
 *       200:
 *         description: Device token removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseSuccess'
 *       400:
 *         description: Failed to remove token
 *       401:
 *         description: Unauthorized
 */
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
