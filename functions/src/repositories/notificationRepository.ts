/**
 * Notification Repository — Firestore CRUD for the `notifications` collection.
 *
 * Follows the same thin-wrapper pattern as `flagReportRepository.ts`:
 *   • A `collection` constant derived from the `FirestoreCollection` enum.
 *   • Each export delegates to a generic helper from `lib/firestore.ts`.
 */
import {FieldPath, Query, Timestamp} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  softDeleteDocument,
  getDb,
} from "../lib/firestore";
import {Notification} from "../types/types";
import {WithMetadata} from "../types/types";
import {OrderField} from "../utils/pagination";
import {
  getCollectionName,
  FirestoreCollection,
} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.NOTIFICATIONS);

// ── Single-document operations ───────────────────────────────────────────────

export const addNotification = async (data: WithMetadata<Notification>) =>
  addDocument(collection, data);

export const findNotificationById = async (id: string) =>
  getDocumentById(collection, id);

export const updateNotification = async (
  id: string,
  updatedData: Partial<Notification>
) => updateDocument(collection, id, updatedData);

export const softDeleteNotification = async (id: string) =>
  softDeleteDocument(collection, id);

// ── Paginated queries ────────────────────────────────────────────────────────

export const findNotificationsByRecipient = async (
  recipientId: string,
  limit: number,
  token?: string,
  queryModifier?: (q: Query) => Query,
  orderFields: OrderField[] = [
    "metadata.created_at",
    FieldPath.documentId(),
  ]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields, {
    queryModifier: (q: Query) => {
      let modified = q.where("recipient_id", "==", recipientId);
      if (queryModifier) modified = queryModifier(modified);
      return modified;
    },
  });

// ── Batch operations ─────────────────────────────────────────────────────────

/**
 * Writes multiple notification documents in a single Firestore batch.
 * Used for multi-recipient events (e.g. mold-report assign → farmer + mycologist).
 * Returns the number of documents written.
 */
export const addBatchNotifications = async (
  notifications: WithMetadata<Notification>[]
): Promise<number> => {
  const db = getDb();
  const batch = db.batch();
  const col = db.collection(collection);

  for (const notif of notifications) {
    const ref = col.doc(); // auto-ID
    batch.set(ref, {
      ...notif,
      metadata: {
        created_at: Timestamp.now(),
      },
    });
  }

  await batch.commit();
  return notifications.length;
};

// ── Aggregation queries ──────────────────────────────────────────────────────

/**
 * Returns the count of unread notifications for a user.
 */
export const countUnreadNotifications = async (
  recipientId: string
): Promise<number> => {
  const db = getDb();
  const snap = await db
    .collection(collection)
    .where("recipient_id", "==", recipientId)
    .where("is_read", "==", false)
    .where("metadata.deleted_at", "==", null)
    .count()
    .get();
  return snap.data().count;
};

/**
 * Marks all unread notifications for a user as read using a batched update.
 * Firestore limits batches to 500 writes, so we loop if necessary.
 */
export const markAllAsReadForRecipient = async (
  recipientId: string
): Promise<number> => {
  const db = getDb();
  let totalUpdated = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection(collection)
      .where("recipient_id", "==", recipientId)
      .where("is_read", "==", false)
      .limit(500)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        is_read: true,
        "metadata.updated_at": Timestamp.now(),
      });
    }
    await batch.commit();
    totalUpdated += snap.size;
  }

  return totalUpdated;
};
