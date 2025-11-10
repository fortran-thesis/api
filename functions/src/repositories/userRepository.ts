import {FieldPath, getFirestore} from "firebase-admin/firestore";
import {devLog} from "../utils/dev";
import {getAuthUserByEmail, getAuthUserById} from "../lib/auth";
import {firebase} from "../configs/firebase";
import {getAuth} from "firebase-admin/auth";
import {
  addDocument,
  deleteDocument,
  getDocumentById,
  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import {IsCurator, User} from "../types/types";
import {OrderField} from "../utils/pagination";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";

const collection: string = getCollectionName(FirestoreCollection.USERS);

export const addUser = async (data: User, uid: string) =>
  addDocument(collection, data, uid);

export const findFirestoreUserById = async (id: string) =>
  getDocumentById(collection, id);

export const findAuthUserById = async (id: string) => getAuthUserById(id);

export const findAuthUserByEmail = async (email: string) =>
  getAuthUserByEmail(email);

export const findAllUsers = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "username", FieldPath.documentId()]
) => getPaginatedDocuments(collection, limit, token, orderFields, {});

export const findUsersByRole = async (
  role: string,
  limit: number,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) => q.where("role", "==", role);
    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", "username", FieldPath.documentId()],
      {queryModifier}
    );
    return paged;
  } catch (err) {
    // Log and return null on error
    devLog(err);
    return null;
  }
};

export const updateFirestoreUser = async (
  uid: string,
  updatedData: Partial<User> | Partial<IsCurator<User>>
) => updateDocument(collection, uid, updatedData);

export const deleteFirestoreUser = async (uid: string) =>
  deleteDocument(collection, uid);

export const softDeleteFirestoreUser = async (uid: string) =>
  softDeleteDocument(collection, uid);

export const countUsersByRoles = async (roles: string[]): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    const snap = await db.collection(collection).where("role", "in", roles).get();
    return snap.size;
  } catch (error) {
    // If query fails (e.g., roles list empty), log and return null
    // Firestore 'in' requires 1-10 values; caller should ensure valid input
    return null;
  }
};

export const countUsersByDisabled = async (): Promise<{ active: number; inactive: number } | null> => {
  try {
    const auth = getAuth();
    let nextPageToken: string | undefined = undefined;
    let active = 0;
    let inactive = 0;
    do {
      const list = await auth.listUsers(1000, nextPageToken);
      for (const u of list.users) {
        if (u.disabled) inactive += 1; else active += 1;
      }
      nextPageToken = list.pageToken ?? undefined;
    } while (nextPageToken);

    return {active, inactive};
  } catch (error) {
    return null;
  }
};
