/**
 * Device Token Repository — Firestore CRUD for FCM registration tokens.
 *
 * Tokens are stored in a subcollection: `users/{userId}/device_tokens/{tokenId}`.
 * Each device/browser registers its own token.  On logout or token refresh the
 * old entry is removed.
 */
import {createHash} from "crypto";
import {Timestamp} from "firebase-admin/firestore";
import {getDb} from "../lib/firestore";
import {DeviceToken, WithMetadata} from "../types/types";

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

const tokenDocId = (token: string): string =>
  createHash("sha256").update(token).digest("hex").slice(0, 20);

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
  const docId = tokenDocId(data.token);
  const now = Timestamp.now();

  const payload: WithMetadata<DeviceToken> = {
    ...data,
    metadata: {
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  };

  const ref = col.doc(docId);
  try {
    await ref.create(payload);
  } catch (error) {
    const errorInfo = error as {message?: string; code?: number | string};
    const message = String(errorInfo?.message || error);
    const code = String(errorInfo?.code || "");
    if (!message.includes("ALREADY_EXISTS") && !message.includes("already-exists") && code !== "6") {
      throw error;
    }

    await ref.update({
      "token": data.token,
      "platform": data.platform,
      "metadata.updated_at": now,
      "metadata.deleted_at": null,
    });
  }
  return docId;
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
  const col = tokensRef(userId);
  const docRef = col.doc(tokenDocId(tokenValue));
  const snap = await docRef.get();
  if (snap.exists) {
    await docRef.delete();
    return;
  }

  const legacySnap = await col.where("token", "==", tokenValue).limit(1).get();
  if (!legacySnap.empty) {
    await legacySnap.docs[0].ref.delete();
  }
};
