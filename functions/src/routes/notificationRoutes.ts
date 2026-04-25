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
  async (req, res) => {
    await markAllReadController(req, res);
  }
);

// ── Device token ─────────────────────────────────────────────────────────────

router.post(
  "/device-token",
  verifyUser(),
  validateBody(RegisterDeviceTokenSchema),
  async (req, res) => {
    await registerDeviceToken(req, res);
  }
);

router.delete(
  "/device-token/:id",
  verifyUser(),
  validateParams(DeviceTokenIdSchema),
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
  async (req, res) => {
    await markRead(req, res);
  }
);

router.delete(
  "/:id",
  verifyUser(),
  validateParams(NotificationIdSchema),
  async (req, res) => {
    await deleteNotification(req, res);
  }
);

export default router;
