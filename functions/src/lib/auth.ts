import { getAuth } from "firebase-admin/auth";
import { firebase } from "../configs/firebase";
import { User } from "../types/types";
import { getDocumentById } from "./firestore";
import { Role } from "../types/enums";
import { concurrent } from "../utils/concurrent";
import { devLog } from "../utils/dev";
import { envOptions } from "../configs/environment";

const auth = getAuth(firebase);

/**
 * Retrieves a user's basic information from Firebase Auth.
 * @param uid - The user's UID
 * @returns The user's public info (uid, email, displayName, photoURL)
 */
export const getUser = async (uid: string): Promise<User | null> => {
  try {
    const [user, userRole] = await concurrent(auth.getUser(uid), getRole(uid));
    if (!user || !userRole)
      throw new Error("User does not exist in Firebase Authentication.");
    return {
      id: user.uid,
      role: userRole,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Retrieves the user's role from the Firestore users collection.
 * @param uid - The user's UID
 * @returns The user's role or null if not found
 */
const getRole = async (uid: string): Promise<Role | null> => {
  try {
    const docSnap = await getDocumentById("users", uid);
    if (!docSnap || !docSnap.exists)
      throw new Error("User does not exist in Firestore.");
    return docSnap.data()?.role;
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
export const verifyToken = async (token: string): Promise<Role | null> => {
  try {
    const { uid } = await auth.verifyIdToken(token);
    if (uid !== (await getUser(uid))?.id) throw new Error("User UID mismatch.");
    return await getRole(uid);
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
): Promise<Role | null> => {
  try {
    const { uid } = await auth.verifySessionCookie(sessionCookie, true);
    if (uid !== (await getUser(uid))?.id) throw new Error("User UID mismatch.");
    return await getRole(uid);
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
