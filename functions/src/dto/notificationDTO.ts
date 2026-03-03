/**
 * Notification DTO — Zod validation schemas for notification endpoints.
 *
 * Follows the same conventions as the other DTO files:
 *   • Zod schemas exported as constants
 *   • Inferred TypeScript types exported alongside
 */
import {z} from "zod";
import {FirestoreIdSchema} from "./shared";
import {NotificationType} from "../types/models/notificationTypes";

// ── Path params ──────────────────────────────────────────────────────────────

export const NotificationIdSchema = z.object({
  id: FirestoreIdSchema(20, "Notification ID"),
});

// ── Device token registration ────────────────────────────────────────────────

export const RegisterDeviceTokenSchema = z.object({
  token: z
    .string({required_error: "FCM token is required."})
    .min(1, {message: "FCM token must not be empty."}),
  platform: z.enum(["android", "ios", "web"], {
    required_error: "Platform is required.",
    invalid_type_error: "Platform must be one of: android, ios, web.",
  }),
});

// ── Mark read ────────────────────────────────────────────────────────────────

export const MarkNotificationReadSchema = z.object({
  is_read: z.boolean({required_error: "is_read is required."}),
});

// ── Query params (GET /notification) ─────────────────────────────────────────

export const NotificationQuerySchema = z.object({
  is_read: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  type: z.nativeEnum(NotificationType).optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .transform(Number)
    .optional(),
  pageToken: z.string().optional(),
});

// ── Device token path param ──────────────────────────────────────────────────

export const DeviceTokenIdSchema = z.object({
  id: FirestoreIdSchema(20, "Device Token ID"),
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type NotificationIdParams = z.infer<typeof NotificationIdSchema>;
export type RegisterDeviceTokenRequest = z.infer<typeof RegisterDeviceTokenSchema>;
export type MarkNotificationReadRequest = z.infer<typeof MarkNotificationReadSchema>;
export type NotificationQueryParams = z.infer<typeof NotificationQuerySchema>;
export type DeviceTokenIdParams = z.infer<typeof DeviceTokenIdSchema>;
