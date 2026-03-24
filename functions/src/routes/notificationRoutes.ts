/**
 * Notification Routes — wires middleware pipeline for notification endpoints.
 *
 * Route pipeline follows the same conventions as `moldReportRoutes.ts`:
 *   verifyUser() → validate* → controller
 */
import {Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {
  NotificationIdSchema,
  NotificationQuerySchema,
  RegisterDeviceTokenSchema,
  DeviceTokenIdSchema,
} from "../dto/notificationDTO";
import {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationByIdController,
  markRead,
  markAllReadController,
  deleteNotification,
  registerDeviceToken,
  unregisterDeviceToken,
} from "../controllers/notificationController";

const router = Router();

// ── List & counts ────────────────────────────────────────────────────────────

router.get(
  "/",
  verifyUser(),
  validateQuery(NotificationQuerySchema),
  cacheGet("notifications"),
  async (req, res) => {
    await getNotifications(req, res);
  }
);

router.get(
  "/unread-count",
  verifyUser(),
  async (req, res) => {
    await getUnreadNotificationCount(req, res);
  }
);

// ── Mark all read (must come before /:id to avoid route conflict) ────────────

router.patch(
  "/read-all",
  verifyUser(),
  cacheInvalidate("notifications", "update"),
  async (req, res) => {
    await markAllReadController(req, res);
  }
);

// ── Device token ─────────────────────────────────────────────────────────────

router.post(
  "/device-token",
  verifyUser(),
  validateBody(RegisterDeviceTokenSchema),
  cacheInvalidate("notification-tokens", "create"),
  async (req, res) => {
    await registerDeviceToken(req, res);
  }
);

router.delete(
  "/device-token/:id",
  verifyUser(),
  validateParams(DeviceTokenIdSchema),
  cacheInvalidate("notification-tokens", "delete"),
  async (req, res) => {
    await unregisterDeviceToken(req, res);
  }
);

// ── Single notification ──────────────────────────────────────────────────────

router.get(
  "/:id",
  verifyUser(),
  validateParams(NotificationIdSchema),
  async (req, res) => {
    await getNotificationByIdController(req, res);
  }
);

router.patch(
  "/:id/read",
  verifyUser(),
  validateParams(NotificationIdSchema),
  cacheInvalidate("notifications", "update"),
  async (req, res) => {
    await markRead(req, res);
  }
);

router.delete(
  "/:id",
  verifyUser(),
  validateParams(NotificationIdSchema),
  cacheInvalidate("notifications", "delete"),
  async (req, res) => {
    await deleteNotification(req, res);
  }
);

export default router;
