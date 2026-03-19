/**
 * Notification Service — business logic for creating, querying, and
 * delivering in-app + push notifications.
 *
 * Architecture mirrors `flagReportService.ts`:
 *   • Plain exported async functions (no classes).
 *   • Returns `T | null` — null on error, never throws.
 *   • FirestoreCollections + WithMetadata patterns reused.
 *
 * FCM delivery is best-effort: push failures never prevent the Firestore
 * notification document from being written.
 */
import {DocumentSnapshot, QuerySnapshot, Timestamp, Query} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {firebase} from "../configs/firebase";
import {
  Notification,
  NotificationType,
  NotificationReferenceType,
  NotificationContext,
  NotificationRecipient,
  WithMetadata,
  PaginatedResult,
  WithId,
} from "../types/types";
import {
  addNotification,
  findNotificationById,
  findNotificationsByRecipient,
  updateNotification,
  softDeleteNotification,
  addBatchNotifications,
  countUnreadNotifications,
  markAllAsReadForRecipient,
} from "../repositories/notificationRepository";
import {
  addDeviceToken,
  getDeviceTokens,
  removeDeviceToken,
  removeDeviceTokenByValue,
} from "../repositories/deviceTokenRepository";

// ═══════════════════════════════════════════════════════════════════════════════
//  MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

type TemplateResolver = (ctx: NotificationContext) => {title: string; body: string};

/**
 * Centralised map that turns a `NotificationType` + free-form context into
 * the `title` / `body` pair persisted in the notification document and sent
 * via FCM.
 *
 * Context keys expected per type:
 *   MOLD_REPORT_ASSIGNED  → case_name, role ("farmer" | "mycologist")
 *   MOLD_REPORT_REJECTED  → case_name
 *   MOLD_REPORT_RESOLVED  → case_name
 *   MOLD_REPORT_CREATED   → case_name
 *   CASE_DETAIL_ADDED     → case_name
 *   FLAG_REPORT_CREATED   → content_type
 *   FLAG_REPORT_RESOLVED  → (none)
 *   CURATOR_APPROVED      → (none)
 *   CURATOR_REJECTED      → (none)
 *   USER_DISABLED         → (none)
 *   USER_ENABLED          → (none)
 *   USER_BANNED           → (none)
 */
const NOTIFICATION_TEMPLATES: Record<NotificationType, TemplateResolver> = {
  [NotificationType.MOLD_REPORT_ASSIGNED]: (ctx) => {
    if (ctx.role === "mycologist") {
      return {
        title: "New Case Assigned",
        body: `You have been assigned to investigate the mold report "${ctx.case_name ?? "Untitled"}".`,
      };
    }
    // Default: farmer / report owner
    return {
      title: "Report Approved",
      body: `Your mold report "${ctx.case_name ?? "Untitled"}" has been approved and assigned to a mycologist. You may now send samples for further analysis.`,
    };
  },

  [NotificationType.MOLD_REPORT_REJECTED]: (ctx) => ({
    title: "Report Rejected",
    body: `Your mold report "${ctx.case_name ?? "Untitled"}" has been reviewed and rejected.`,
  }),

  [NotificationType.MOLD_REPORT_RESOLVED]: (ctx) => ({
    title: "Report Resolved",
    body: `Your mold report "${ctx.case_name ?? "Untitled"}" has been marked as resolved.`,
  }),

  [NotificationType.MOLD_REPORT_CREATED]: (ctx) => ({
    title: "New Mold Report",
    body: `A new mold report "${ctx.case_name ?? "Untitled"}" has been submitted and is pending review.`,
  }),

  [NotificationType.CASE_DETAIL_ADDED]: (ctx) => ({
    title: "New Case Detail",
    body: `A new detail has been added to the mold report "${ctx.case_name ?? "Untitled"}".`,
  }),

  [NotificationType.SAMPLES_RECEIVED]: (ctx) => ({
    title: "Samples Received",
    body: ctx.brought_by ?
      `${ctx.brought_by} has brought samples for "${ctx.case_name ?? "Untitled"}".` :
      `Samples for "${ctx.case_name ?? "Untitled"}" have been received.`,
  }),

  [NotificationType.FLAG_REPORT_CREATED]: (ctx) => ({
    title: "New Flag Report",
    body: `A ${ctx.content_type ?? "content"} has been flagged for review.`,
  }),

  [NotificationType.FLAG_REPORT_RESOLVED]: () => ({
    title: "Flag Report Resolved",
    body: "Your flag report has been reviewed and resolved.",
  }),

  [NotificationType.CURATOR_APPROVED]: () => ({
    title: "Application Approved",
    body: "Your mycologist application has been approved! You can now access curator features.",
  }),

  [NotificationType.CURATOR_REJECTED]: () => ({
    title: "Application Not Approved",
    body: "Your mycologist application was not approved at this time.",
  }),

  [NotificationType.USER_DISABLED]: () => ({
    title: "Account Disabled",
    body: "Your account has been temporarily disabled by an administrator.",
  }),

  [NotificationType.USER_ENABLED]: () => ({
    title: "Account Re-enabled",
    body: "Your account has been re-enabled. You can now log in again.",
  }),

  [NotificationType.USER_BANNED]: () => ({
    title: "Account Banned",
    body: "Your account has been permanently banned due to policy violations.",
  }),
};

/**
 * Resolves the title / body for a notification from its type + context.
 */
export const resolveTemplate = (
  type: NotificationType,
  context: NotificationContext = {}
): {title: string; body: string} => {
  const resolver = NOTIFICATION_TEMPLATES[type];
  if (!resolver) return {title: "Notification", body: ""};
  return resolver(context);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CREATE / BATCH CREATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a single notification document in Firestore and sends an FCM push.
 */
export const createNotification = async (
  recipientId: string,
  type: NotificationType,
  context: NotificationContext = {},
  referenceId: string | null = null,
  referenceType: NotificationReferenceType | null = null
): Promise<WithId<Notification> | null> => {
  try {
    const {title, body} = resolveTemplate(type, context);

    const payload: WithMetadata<Notification> = {
      recipient_id: recipientId,
      type,
      title,
      body,
      reference_id: referenceId,
      reference_type: referenceType,
      is_read: false,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const doc: DocumentSnapshot | null = await addNotification(payload);
    if (!doc) throw new Error("Failed to write notification document.");

    // Fire-and-forget push — never fails the HTTP response.
    sendPushToUser(recipientId, title, body, {
      type,
      reference_id: referenceId ?? "",
      reference_type: referenceType ?? "",
    }).catch((err) => devLog(err, "createNotification > sendPushToUser"));

    return documentToJson<Notification>(doc);
  } catch (error) {
    devLog(error, "createNotification");
    return null;
  }
};

/**
 * Creates notifications for multiple recipients in a single Firestore batch,
 * then sends FCM pushes to each.
 *
 * Each recipient may override the notification `type` and inject extra
 * context (see `NotificationRecipient`).
 */
export const createBatchNotifications = async (
  recipients: NotificationRecipient[],
  defaultType: NotificationType,
  defaultContext: NotificationContext = {},
  referenceId: string | null = null,
  referenceType: NotificationReferenceType | null = null
): Promise<number> => {
  try {
    const payloads: WithMetadata<Notification>[] = recipients.map((r) => {
      const type = r.type ?? defaultType;
      const mergedCtx = {...defaultContext, ...(r.extraContext ?? {})};
      const {title, body} = resolveTemplate(type, mergedCtx);

      return {
        recipient_id: r.recipientId,
        type,
        title,
        body,
        reference_id: referenceId,
        reference_type: referenceType,
        is_read: false,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      };
    });

    const count = await addBatchNotifications(payloads);

    // Fire-and-forget FCM pushes for each recipient
    for (const payload of payloads) {
      sendPushToUser(
        payload.recipient_id,
        payload.title,
        payload.body,
        {
          type: payload.type,
          reference_id: payload.reference_id ?? "",
          reference_type: payload.reference_type ?? "",
        }
      ).catch((err) => devLog(err, "createBatchNotifications > sendPushToUser"));
    }

    return count;
  } catch (error) {
    devLog(error, "createBatchNotifications");
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotificationsForUser = async (
  userId: string,
  limit = 20,
  pageToken?: string,
  filters?: {is_read?: boolean; type?: NotificationType}
): Promise<PaginatedResult<WithId<Notification>[]> | null> => {
  try {
    const queryModifier = (q: Query): Query => {
      let modified = q;
      if (filters?.is_read !== undefined) {
        modified = modified.where("is_read", "==", filters.is_read);
      }
      if (filters?.type) {
        modified = modified.where("type", "==", filters.type);
      }
      return modified;
    };

    const result = await findNotificationsByRecipient(
      userId,
      limit,
      pageToken,
      queryModifier
    );

    if (!result) return null;

    const snapshot = result.snapshot as unknown as QuerySnapshot;
    return {
      snapshot: queryToJson<Notification>(snapshot),
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    devLog(error, "getNotificationsForUser");
    return null;
  }
};

export const getNotificationById = async (
  id: string,
  userId: string
): Promise<WithId<Notification> | null> => {
  try {
    const doc: DocumentSnapshot | null = await findNotificationById(id);
    if (!doc || !doc.exists) return null;
    const notif = documentToJson<Notification>(doc);
    // Ownership check
    if (notif.recipient_id !== userId) return null;
    return notif;
  } catch (error) {
    devLog(error, "getNotificationById");
    return null;
  }
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    return await countUnreadNotifications(userId);
  } catch (error) {
    devLog(error, "getUnreadCount");
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

export const markNotificationRead = async (
  id: string,
  userId: string
): Promise<boolean> => {
  try {
    // Ownership check
    const existing = await getNotificationById(id, userId);
    if (!existing) return false;
    const result = await updateNotification(id, {is_read: true} as any);
    return !!result;
  } catch (error) {
    devLog(error, "markNotificationRead");
    return false;
  }
};

export const markAllRead = async (userId: string): Promise<number> => {
  try {
    return await markAllAsReadForRecipient(userId);
  } catch (error) {
    devLog(error, "markAllRead");
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════════════════════

export const deleteNotificationForUser = async (
  id: string,
  userId: string
): Promise<boolean> => {
  try {
    const existing = await getNotificationById(id, userId);
    if (!existing) return false;
    const result = await softDeleteNotification(id);
    return !!result;
  } catch (error) {
    devLog(error, "deleteNotificationForUser");
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DEVICE TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const registerToken = async (
  userId: string,
  token: string,
  platform: "android" | "ios" | "web"
): Promise<string | null> => {
  try {
    return await addDeviceToken(userId, {token, platform});
  } catch (error) {
    devLog(error, "registerToken");
    return null;
  }
};

export const unregisterToken = async (
  userId: string,
  tokenId: string
): Promise<boolean> => {
  try {
    await removeDeviceToken(userId, tokenId);
    return true;
  } catch (error) {
    devLog(error, "unregisterToken");
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FCM PUSH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sends an FCM push notification to all registered devices for a user.
 * Stale tokens (messaging/registration-token-not-registered) are automatically
 * cleaned up.
 */
const sendPushToUser = async (
  recipientId: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> => {
  try {
    const tokens = await getDeviceTokens(recipientId);
    if (!tokens.length) return;

    const messaging = getMessaging(firebase);
    const tokenStrings = tokens.map((t) => t.token);

    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {title, body},
      data,
    });

    // Clean up any stale tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (
          resp.error &&
          (resp.error.code === "messaging/registration-token-not-registered" ||
            resp.error.code === "messaging/invalid-registration-token")
        ) {
          removeDeviceTokenByValue(recipientId, tokenStrings[idx]).catch(
            (err) => devLog(err, "sendPushToUser > removeStaleToken")
          );
        }
      });
    }
  } catch (error) {
    devLog(error, "sendPushToUser");
  }
};
