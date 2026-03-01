import {getAuth, UserRecord} from "firebase-admin/auth";
import {firebase} from "../configs/firebase";
import {User, WithId, APIUser} from "../types/types";
import {findFirestoreUserById} from "../repositories/userRepository";
import {concurrent} from "../utils/concurrent";
import {devLog} from "../utils/dev";
import {envOptions} from "../configs/environment";
import {transformToSignedUrl} from "../utils/storageTransform";
import {normalizeRole} from "../utils/roleNormalizer";
import {LRUCache} from "lru-cache";

const auth = getAuth(firebase);

// In-memory LRU cache for auth user objects — avoids 5+ external calls per request
// TTL of 5 minutes balances freshness with performance. Max 500 entries fits in memory.
const authUserCache = new LRUCache<string, WithId<APIUser>>({
  max: 500,
  ttl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Retrieves a user's information from Firebase Auth + Firestore.
 * Results are cached in-memory for 5 minutes to avoid repeated external calls.
 * @param uid - The user's UID
 * @return The user's public info
 */
export const getAuthUserById = async (uid: string): Promise<WithId<APIUser> | null> => {
  try {
    // Check LRU cache first
    const cached = authUserCache.get(uid);
    if (cached) {
      devLog(`[AUTH_CACHE] Hit for uid=${uid}`);
      return cached;
    }

    const result = await concurrent(auth.getUser(uid), findFirestoreUserById(uid));
    const user = result[0] as UserRecord;
    const firestoreUser = result[1].data() as User | null;
    if (!user || !firestoreUser) {
      throw new Error("User does not exist in Firebase Authentication.");
    }
    let finalPhotoUrl = "";
    if (user.photoURL) {
      const signed = await transformToSignedUrl(user.photoURL);
      finalPhotoUrl = signed || user.photoURL;
    }

    const apiUser: WithId<APIUser> = {
      id: user.uid,
      user: {
        username: firestoreUser.username,
        first_name: firestoreUser.first_name,
        last_name: firestoreUser.last_name,
        address: firestoreUser.address,
        role: normalizeRole(firestoreUser.role),
        is_banned: firestoreUser.is_banned,
      },
      details: {
        email: user.email,
        displayName: user.displayName,
        photo_url: finalPhotoUrl,
        disabled: user.disabled,
        phone_number: user.phoneNumber,
        address: firestoreUser.address,
      },
    };

    // Store in cache
    authUserCache.set(uid, apiUser);

    return apiUser;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Batch-fetches multiple users by UID using a single Auth call + parallel Firestore lookups.
 * Leverages the LRU cache — only fetches users not already cached.
 * Returns a Map<uid, WithId<APIUser>> for O(1) lookups.
 */
export const getAuthUsersByIds = async (
  uids: string[]
): Promise<Map<string, WithId<APIUser>>> => {
  const result = new Map<string, WithId<APIUser>>();
  const uncachedUids: string[] = [];

  // Check cache first
  for (const uid of uids) {
    const cached = authUserCache.get(uid);
    if (cached) {
      result.set(uid, cached);
    } else {
      uncachedUids.push(uid);
    }
  }

  if (uncachedUids.length === 0) {
    devLog(`[AUTH_BATCH] All ${uids.length} users served from cache`);
    return result;
  }

  devLog(`[AUTH_BATCH] Cache hit ${uids.length - uncachedUids.length}/${uids.length}, fetching ${uncachedUids.length} from Auth+Firestore`);

  try {
    // Batch Auth lookup (single RPC call for up to 100 users)
    const identifiers = uncachedUids.map((uid) => ({uid}));
    const [authResult, ...firestoreDocs] = await Promise.all([
      auth.getUsers(identifiers),
      ...uncachedUids.map((uid) => findFirestoreUserById(uid)),
    ]);

    const authUsersMap = new Map(authResult.users.map((u) => [u.uid, u]));

    // Build signed URLs in parallel for users with photos
    const photoPromises = uncachedUids.map(async (uid) => {
      const authUser = authUsersMap.get(uid);
      if (authUser?.photoURL) {
        return transformToSignedUrl(authUser.photoURL);
      }
      return null;
    });
    const signedUrls = await Promise.all(photoPromises);

    for (let i = 0; i < uncachedUids.length; i++) {
      const uid = uncachedUids[i];
      const authUser = authUsersMap.get(uid);
      const firestoreDoc = firestoreDocs[i];
      const firestoreUser = firestoreDoc?.data() as User | null;

      if (!authUser || !firestoreUser) continue;

      const apiUser: WithId<APIUser> = {
        id: authUser.uid,
        user: {
          username: firestoreUser.username,
          first_name: firestoreUser.first_name,
          last_name: firestoreUser.last_name,
          address: firestoreUser.address,
          role: normalizeRole(firestoreUser.role),
          is_banned: firestoreUser.is_banned,
        },
        details: {
          email: authUser.email,
          displayName: authUser.displayName,
          photo_url: signedUrls[i] || authUser.photoURL || "",
          disabled: authUser.disabled,
          phone_number: authUser.phoneNumber,
          address: firestoreUser.address,
        },
      };

      authUserCache.set(uid, apiUser);
      result.set(uid, apiUser);
    }
  } catch (error) {
    devLog(error, "AUTH_BATCH_ERROR");
    // Fallback to individual lookups for any that failed
    for (const uid of uncachedUids) {
      if (!result.has(uid)) {
        const user = await getAuthUserById(uid);
        if (user) result.set(uid, user);
      }
    }
  }

  return result;
};

export const getAuthUserByEmail = async (email: string): Promise<WithId<APIUser> | null> => {
  try {
    const user = await auth.getUserByEmail(email);

    // Check if we already have this user cached by UID
    const cached = authUserCache.get(user.uid);
    if (cached) {
      devLog(`[AUTH_CACHE] Hit by email->uid for uid=${user.uid}`);
      return cached;
    }

    const firestoreUserDocs = await findFirestoreUserById(user.uid);
    if (!user || !firestoreUserDocs) throw new Error("User does not exist in Firebase Authentication.");
    const firestoreUser = firestoreUserDocs.data() as User;
    let finalPhotoUrl = "";
    if (user.photoURL) {
      const signed = await transformToSignedUrl(user.photoURL);
      finalPhotoUrl = signed || user.photoURL;
    }

    const apiUser: WithId<APIUser> = {
      id: user.uid,
      user: {
        username: firestoreUser.username,
        first_name: firestoreUser.first_name,
        last_name: firestoreUser.last_name,
        address: firestoreUser.address,
        role: normalizeRole(firestoreUser.role),
        is_banned: firestoreUser.is_banned,
      },
      details: {
        email: user.email,
        displayName: user.displayName,
        photo_url: finalPhotoUrl,
        disabled: user.disabled,
        phone_number: user.phoneNumber,
        address: firestoreUser.address,
      },
    };

    // Cache by UID
    authUserCache.set(user.uid, apiUser);

    return apiUser;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Invalidate a specific user from the auth cache (call after user updates).
 */
export const invalidateAuthUserCache = (uid: string): void => {
  authUserCache.delete(uid);
};

/**
 * Verifies a Firebase ID token and returns the user.
 */
export const verifyToken = async (token: string): Promise<WithId<APIUser> | null> => {
  try {
    const uid = (await auth.verifyIdToken(token)).uid;
    if (!uid) throw new Error("Invalid token.");
    const user = await getAuthUserById(uid);
    if (uid !== user?.id) throw new Error("User UID mismatch.");
    return user;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Verifies a Firebase session cookie and returns the user.
 */
export const verifyCookie = async (
  sessionCookie: string
): Promise<WithId<APIUser> | null> => {
  try {
    const uid = (await auth.verifySessionCookie(sessionCookie, true)).uid;
    if (!uid) throw new Error("Invalid token.");
    const user = await getAuthUserById(uid);
    if (uid !== user?.id) throw new Error("User UID mismatch.");
    return user;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const generateCookie = async (token: string) => {
  try {
    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn: envOptions.maxSessionAge,
    });
    return sessionCookie;
  } catch (error) {
    devLog(error);
    // Firebase Auth Emulator does not reliably support createSessionCookie.
    // In test mode, fall back to the raw ID token so the login flow can
    // still complete and the response returns 200.
    if (envOptions.isTest) return token;
    return null;
  }
};
