import { getAuth, UserRecord } from "firebase-admin/auth";
import { firebase } from "../configs/firebase";
import { User, WithId } from "../types/types";
import { getDocumentById } from "./firestore";
import { concurrent } from "../utils/concurrent";
import { devLog } from "../utils/dev";
import { envOptions } from "../configs/environment";
import { APIUser } from "../types/types";

const auth = getAuth(firebase);

/**
 * Retrieves a user's basic information from Firebase Auth.
 * @param uid - The user's UID
 * @returns The user's public info (uid, email, displayName, photoURL)
 */
export const getAuthUserById = async (uid: string): Promise<WithId<APIUser> | null> => {
  try {
    const result = await concurrent(auth.getUser(uid), getFirestoreUser(uid));
    const user = result[0] as UserRecord;
    const firestoreUser = result[1] as User | null;
    if (!user || !firestoreUser)
      throw new Error("User does not exist in Firebase Authentication.");
    return {
      id: user.uid,
      user: {
        username: firestoreUser.username,
        role: firestoreUser.role
      },
      details: {
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getAuthUserByEmail = async (email: string): Promise<WithId<APIUser> | null> => {
  try {
    const user = await auth.getUserByEmail(email);
    const firestoreUser = await getFirestoreUser(user.uid);
    if (!user || !firestoreUser)
      throw new Error("User does not exist in Firebase Authentication.");
    return {
      id: user.uid,
      user: {
        username: firestoreUser.username,
        role: firestoreUser.role
      },
      details: {
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    devLog(error);
    return null;
  }
}

/**
 * Retrieves the user's role from the Firestore users collection.
 * @param uid - The user's UID
 * @returns The user's role or null if not found
 */
const getFirestoreUser = async (uid: string): Promise<User | null> => {
  try {
    const snap = await getDocumentById("users", uid);
    if (snap && Array.isArray(snap.docs) && snap.docs.length > 0) {
      return snap.docs[0].data() as User;
    }
    return null;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Verifies a Firebase ID token and optionally checks for a required user role.
 * @param token - The Firebase ID token
 * @param requiredRole - (Optional) The required user role
 * @returns True if valid and (if specified) role matches, else false
 */
export const verifyToken = async (token: string): Promise<WithId<APIUser> | null> => {
  try {
    const { uid } = await auth.verifyIdToken(token);
    const user = await getAuthUserById(uid);
    if (uid !== user?.id) throw new Error("User UID mismatch.");
    return user
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Verifies a Firebase session cookie and optionally checks for a required user role.
 * @param sessionCookie - The Firebase session cookie
 * @param requiredRole - (Optional) The required user role
 * @returns True if valid and (if specified) role matches, else false
 */
export const verifyCookie = async (
  sessionCookie: string
): Promise<WithId<APIUser>  | null> => {
  try {
    const { uid } = await auth.verifySessionCookie(sessionCookie, true);
    const user = await getAuthUserById(uid);
    if (uid !== user?.id) throw new Error("User UID mismatch.");
    return user
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
    return null;
  }
};
