// ── Notification type ────────────────────────────────────────────────────────

/**
 * Every distinct event that can generate an in-app notification.
 * Values are lowercase-kebab so they read well both in Firestore documents
 * and on the client side.
 */
export enum NotificationType {
  // Mold report lifecycle
  MOLD_REPORT_CREATED = "mold_report_created",
  MOLD_REPORT_ASSIGNED = "mold_report_assigned",
  MOLD_REPORT_UNASSIGNED = "mold_report_unassigned",
  MOLD_REPORT_REJECTED = "mold_report_rejected",
  MOLD_REPORT_RESOLVED = "mold_report_resolved",
  CASE_DETAIL_ADDED = "case_detail_added",

  // Samples lifecycle
  SAMPLES_RECEIVED = "samples_received",

  // Flag report lifecycle
  FLAG_REPORT_CREATED = "flag_report_created",
  FLAG_REPORT_RESOLVED = "flag_report_resolved",

  // Curator (mycologist) application lifecycle
  CURATOR_APPROVED = "curator_approved",
  CURATOR_REJECTED = "curator_rejected",

  // Admin → user actions
  USER_DISABLED = "user_disabled",
  USER_ENABLED = "user_enabled",
  USER_BANNED = "user_banned",
}

/**
 * Reference types that a notification can link to.
 * Tells the client which detail screen to navigate to.
 */
export type NotificationReferenceType =
  | "mold_report"
  | "flag_report"
  | "mold_case"
  | "user";

// ── Notification document ────────────────────────────────────────────────────

/**
 * Shape of a document stored in the top-level `notifications` collection.
 * Every notification targets exactly one recipient.
 */
export interface Notification {
  /** Firebase Auth UID of the user who should see this notification. */
  recipient_id: string;
  /** Categorises the event so the client can show the right icon / route. */
  type: NotificationType;
  /** Human-readable headline (e.g. "Report Approved"). */
  title: string;
  /** Longer description (e.g. "Your mold report 'Kitchen Mold' …"). */
  body: string;
  /** ID of the related resource (mold report, flag report, user, …). */
  reference_id: string | null;
  /** Tells the client which resource the `reference_id` points to. */
  reference_type: NotificationReferenceType | null;
  /** Whether the recipient has seen / acknowledged this notification. */
  is_read: boolean;
}

// ── Device token (FCM) ──────────────────────────────────────────────────────

/**
 * FCM registration token stored in the `users/{uid}/device_tokens`
 * subcollection.  Each device (phone, browser tab) registers its own token.
 */
export interface DeviceToken {
  /** The FCM registration token string. */
  token: string;
  /** Platform that generated the token. */
  platform: "android" | "ios" | "web";
}

// ── Helper types used by the notification middleware ─────────────────────────

/**
 * Context object passed to notification message templates.
 * Keys are placeholder names (e.g. `case_name`, `content_type`).
 */
export type NotificationContext = Record<string, string>;

/**
 * Describes a single recipient inside a `notify()` middleware config.
 * The optional `type` override allows the same event to produce
 * different notification types per recipient (e.g. assign → farmer gets
 * MOLD_REPORT_ASSIGNED, mycologist also gets MOLD_REPORT_ASSIGNED but
 * with a different template branch).
 */
export interface NotificationRecipient {
  recipientId: string;
  /** Override the config-level type for this specific recipient. */
  type?: NotificationType;
  /** Override context per recipient (merged on top of the shared context). */
  extraContext?: NotificationContext;
}
