import { firebase } from "../configs/firebase";
import { FieldPath, getFirestore, Timestamp } from "firebase-admin/firestore";
import { devLog } from "../utils/dev";
import { WithId, WithMetadata } from "../types/types";

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
  document: T,
  uid?: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const withMetadata: WithMetadata<T> = {
      ...document,
      metadata: {
        created_at: Timestamp.now(),
      },
    };
    if (uid) {
      const ref = callFirebase(collection).doc(uid);
      await ref.set(withMetadata);
      return ref.get();
    }

    return (await callFirebase(collection).add(document)).get();
  } catch (error) {
    devLog(error);
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
    const withMetadata: WithMetadata<Partial<T>> = {
      ...updateData,
      metadata: {
        updated_at: Timestamp.now(),
      },
    };
    return await callFirebase(collection)
      .doc(documentUid)
      .update(withMetadata, {
        exists: true,
        lastUpdateTime: await getUpdateTime(collection, documentUid),
      });
  } catch (error) {
    devLog(error);
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

export const softDeleteDocument = async (
  collection: string,
  documentUid: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await updateDocument(collection, documentUid, {
      metadata: { deleted_at: Timestamp.now() },
    });
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getDocumentsByField = async (
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

export const getDocumentIdByField = async (
  collection: string,
  documentField: string,
  documentContent: string
): Promise<string | null> => {
  try {
    const querySnap = await getDocumentsByField(
      collection,
      documentField,
      documentContent
    );
    if (querySnap && !querySnap.empty) {
      return querySnap.docs[0].id;
    }
    return null;
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
): Promise<FirebaseFirestore.QuerySnapshot | null> => {
  try {
    const querySnap = await getDocumentsByField(collection, "id", documentUid);
    if (!querySnap || querySnap.empty)
      throw new Error("Document does not exist");
    return querySnap;
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

export const getPaginatedDocuments = async (
  collection: string,
  limit: number,
  offset: number,
  field?: string | FieldPath,
  content?: string
): Promise<FirebaseFirestore.QuerySnapshot | null> => {
  try {
    let query;
    if (field && content) {
      query = await callFirebase(collection)
        .where(field, "==", content)
        .orderBy(FirebaseFirestore.FieldPath.documentId());
    } else {
      query = await callFirebase(collection).orderBy(
        FirebaseFirestore.FieldPath.documentId()
      );
    }
    if (offset && offset > 0) {
      query = query.offset(offset);
    }
    if (limit && limit > 0) {
      query = query.limit(limit);
    }
    const querySnap = await query.get();
    if (querySnap.empty) throw new Error("No documents found");
    return querySnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const queryToJson = <T>(
  querySnap: FirebaseFirestore.QuerySnapshot
): WithId<T>[] => {
  return querySnap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as T & { id: string }
  );
};

export const documentToJson = <T>(
  docSnap: FirebaseFirestore.DocumentSnapshot
): WithId<T> => {
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as T & { id: string };
};

export { getFirestore };
