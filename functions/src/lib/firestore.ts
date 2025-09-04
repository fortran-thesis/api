import { firebase } from "../configs/firebase";
import { FieldPath, getFirestore, QuerySnapshot, Timestamp } from "firebase-admin/firestore";
import { devLog } from "../utils/dev";
import { PaginatedResult, WithId, WithMetadata } from "../types/types";
import { GetPaginatedOptions, OrderField, paginateQuery } from '../utils/pagination';

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
      if((await ref.get()).exists) throw new Error('User already exists');
      await ref.set(withMetadata);
      return await ref.get();
    }

    return (await callFirebase(collection).add(withMetadata)).get();
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
        ...(updateData as any).metadata,
        updated_at: Timestamp.now(),
      },
    };
    return await callFirebase(collection)
      .doc(documentUid)
      .update(withMetadata);
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
        exists: true
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
      metadata: {
        deleted_at: Timestamp.now(),
      },
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

/**
 * Returns the document ID for the first document in a collection where a field matches a value.
 * @param collection - The name of the Firestore collection
 * @param field - The field name to match
 * @param value - The value to match
 * @returns The document ID or null if not found/error
 */
export const getDocumentIdByField = async (
  collection: string,
  field: string,
  value: string
): Promise<string | null> => {
  try {
    const querySnap = await callFirebase(collection)
      .where(field, "==", value)
      .limit(1)
      .get();
    if (querySnap.empty) return null;
    return querySnap.docs[0].id;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Returns the document snapshot for the first document in a collection where a field matches a value.
 * @param collection - The name of the Firestore collection
 * @param field - The field name to match
 * @param value - The value to match
 * @returns The document snapshot or null if not found/error
 */
export const getDocumentByFieldId = async (
  collection: string,
  field: string,
  value: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const querySnap = await callFirebase(collection)
      .where(field, "==", value)
      .limit(1)
      .get();
    if (querySnap.empty) return null;
    return querySnap.docs[0];
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Retrieves a single Firestore document by its document ID.
 * @param collection - The name of the Firestore collection
 * @param documentUid - The document ID
 * @returns The document snapshot or null if not found/error
 */
export const getDocumentById = async (
  collection: string,
  uid: string
): Promise<FirebaseFirestore.DocumentSnapshot| null> => {
  try {
    const docSnap = await callFirebase(collection).doc(uid).get();
    if (!docSnap.exists) throw new Error("Document does not exist");
    return docSnap
  } catch (error) {
    devLog(error);
    return null;
  }
}

export const getPaginatedDocuments = async (
  collection: string,
  limit: number,
  token?: string,
  orderFields: OrderField[] = [FieldPath.documentId()],
  options: GetPaginatedOptions = {}
): Promise<PaginatedResult<QuerySnapshot> | null> => {
  try {
    const dbQueryBase: FirebaseFirestore.Query = callFirebase(collection);

    // Apply optional filters or other query modifiers first (where, startAt/endAt, etc.)
    let query: FirebaseFirestore.Query = options.queryModifier ? options.queryModifier(dbQueryBase) : dbQueryBase;

    // Apply orderBy for each order field (paginateQuery expects the same ordering sequence)
    for (const field of orderFields) {
      query = query.orderBy(field);
    }

    // Delegate to paginateQuery (it will apply startAfter(token) and limit)
    return await paginateQuery(query, limit, token, orderFields);
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

export const deleteCollection = async (collection: string) => {
  const querySnap = await callFirebase(collection).get();
  const batch = db.batch();
  querySnap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};

export { getFirestore };
