/**
 * Device Token Repository — Firestore CRUD for FCM registration tokens.
 *
 * Tokens are stored in a subcollection: `users/{userId}/device_tokens/{tokenId}`.
 * Each device/browser registers its own token.  On logout or token refresh the
 * old entry is removed.
 */
import {Timestamp} from "firebase-admin/firestore";
import {getDb} from "../lib/firestore";
import {DeviceToken} from "../types/types";
import {WithMetadata} from "../types/types";
import {
  FirestoreSubcollection,
  FirestoreCollection,
  getCollectionName,
} from "../types/models/firestoreCollections";

const usersCol = getCollectionName(FirestoreCollection.USERS);
const subCol = FirestoreSubcollection.DEVICE_TOKENS;

// ── Helpers ──────────────────────────────────────────────────────────────────

const tokensRef = (userId: string) =>
  getDb().collection(usersCol).doc(userId).collection(subCol);

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Registers an FCM token for a user.
 * If the exact token string already exists it is overwritten (upsert)
 * so we never store duplicates.
 */
export const addDeviceToken = async (
  userId: string,
  data: DeviceToken
): Promise<string> => {
  const col = tokensRef(userId);

  // Upsert: check if this token string already exists
  const existing = await col.where("token", "==", data.token).limit(1).get();
  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await col.doc(docId).update({
      platform: data.platform,
      "metadata.updated_at": Timestamp.now(),
    });
    return docId;
  }

  const payload: WithMetadata<DeviceToken> = {
    ...data,
    metadata: {created_at: Timestamp.now()},
  };
  const ref = await col.add(payload);
  return ref.id;
};

/**
 * Returns all device tokens for a user.
 */
export const getDeviceTokens = async (
  userId: string
): Promise<Array<{id: string; token: string; platform: string}>> => {
  const snap = await tokensRef(userId).get();
  return snap.docs.map((d) => ({
    id: d.id,
    token: d.data().token as string,
    platform: d.data().platform as string,
  }));
};

/**
 * Removes a specific device token document.
 */
export const removeDeviceToken = async (
  userId: string,
  tokenId: string
): Promise<void> => {
  await tokensRef(userId).doc(tokenId).delete();
};

/**
 * Removes a device token by its FCM token string (e.g. on token refresh or
 * when FCM reports the token as unregistered).
 */
export const removeDeviceTokenByValue = async (
  userId: string,
  tokenValue: string
): Promise<void> => {
  const snap = await tokensRef(userId)
    .where("token", "==", tokenValue)
    .limit(1)
    .get();
  if (!snap.empty) {
    await snap.docs[0].ref.delete();
  }
};
