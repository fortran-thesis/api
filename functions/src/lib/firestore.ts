import { envOptions } from "../configs/environment";
import { firebase } from "../configs/firebase";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { devLog } from "../utils/dev";

const db = getFirestore(firebase);

/**
 * Returns a Firestore collection reference for the given collection name.
 * @param collection - The name of the Firestore collection
 * @returns The collection reference
 */
const callFirebase = (
  collection: string
): FirebaseFirestore.CollectionReference => db.collection(collection);

/**
 * Retrieves the last update time (updateTime) of a Firestore document.
 * @param collection - The name of the Firestore collection
 * @param documentUid - The document ID
 * @returns The update time or undefined if not found
 */
const getUpdateTime = async (
  collection: string,
  documentUid: string
): Promise<Timestamp | undefined> => {
  return (await callFirebase(collection).doc(documentUid).get()).updateTime;
};

/**
 * Adds a new document to a Firestore collection.
 * @template T
 * @param collection - The name of the Firestore collection
 * @param document - The document data to add
 * @returns The document reference or null on error
 */
export const addDocument = async <T extends object>(
  collection: string,
  document: T
): Promise<FirebaseFirestore.DocumentReference | null> => {
  try {
    return await callFirebase(collection).add(document);
  } catch (error) {
    if (!envOptions.isProd) console.error("Error: ", error);
    return null;
  }
};

/**
 * Updates an existing Firestore document with the provided data.
 * Uses preconditions to ensure the document exists and has not changed since last read.
 * @template T
 * @param collection - The name of the Firestore collection
 * @param documentUid - The document ID
 * @param updateData - The partial data to update
 * @returns The write result or null on error
 */
export const updateDocument = async <T extends object>(
  collection: string,
  documentUid: string,
  updateData: Partial<T>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await callFirebase(collection)
      .doc(documentUid)
      .update(updateData, {
        exists: true,
        lastUpdateTime: await getUpdateTime(collection, documentUid),
      });
  } catch (error) {
    if (!envOptions.isProd) console.error("Error: ", error);
    return null;
  }
};

/**
 * Deletes a Firestore document by ID.
 * Uses preconditions to ensure the document exists and has not changed since last read.
 * @param collection - The name of the Firestore collection
 * @param documentUid - The document ID
 * @returns The write result or null on error
 */
export const deleteDocument = async (
  collection: string,
  documentUid: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await callFirebase(collection)
      .doc(documentUid)
      .delete({
        exists: true,
        lastUpdateTime: await getUpdateTime(collection, documentUid),
      });
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getDocumentByField = async (
  collection: string,
  documentField: string,
  documentContent: string
): Promise<FirebaseFirestore.QuerySnapshot | null> => {
  try {
    const querySnap = await callFirebase(collection)
      .where(documentField, "==", documentContent)
      .get();
    if (querySnap.empty) throw new Error("No documents found");
    return querySnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Retrieves a single Firestore document by ID.
 * @param collection - The name of the Firestore collection
 * @param documentUid - The document ID
 * @returns The document snapshot or null if not found/error
 */
export const getDocumentById = async (
  collection: string,
  documentUid: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const docSnap = await callFirebase(collection).doc(documentUid).get();
    if (!docSnap.exists) throw new Error("Document does not exist");

    return docSnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Retrieves all documents in a Firestore collection.
 * @param collection - The name of the Firestore collection
 * @returns The query snapshot or null if empty/error
 */
export const getAllDocuments = async (
  collection: string
): Promise<FirebaseFirestore.QuerySnapshot | null> => {
  try {
    const querySnap = await callFirebase(collection).get();
    if (querySnap.empty) throw new Error("No documents found");
    return querySnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const queryToJson = <T>(
  querySnap: FirebaseFirestore.QuerySnapshot
): T[] => {
  return querySnap.docs.map((doc) => doc.data() as T);
};

export const documentToJson = <T>(
  docSnap: FirebaseFirestore.DocumentSnapshot
): T => {
  return docSnap.data() as T;
};
