import {firebase} from "../configs/firebase";
import {
  FieldPath,
  getFirestore,
  QuerySnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import {devLog} from "../utils/dev";
import {PaginatedResult, WithId, WithMetadata} from "../types/types";
import {
  GetPaginatedOptions,
  OrderField,
  paginateQuery,
} from "../utils/pagination";

const db = getFirestore(firebase);

/**
 * Returns the Firestore database instance.
 * Useful for running transactions or other operations requiring direct db access.
 */
export const getDb = () => db;

/**
 * Returns a Firestore collection reference for the given collection name.
 * @param collection - The name of the Firestore collection
 * @return The collection reference
 */
const callFirebase = (
  collection: string
): FirebaseFirestore.CollectionReference => db.collection(collection);

/**
 * Adds a new document to a Firestore collection.
 * @template T
 * @param collection - The name of the Firestore collection
 * @param document - The document data to add
 * @param uid - Optional custom document ID
 * @return The document reference or null on error
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
      devLog(`📝 addDocument: Creating document in '${collection}' with UID=${uid}`);
      const ref = callFirebase(collection).doc(uid);
      const existsSnap = await ref.get();
      if (existsSnap.exists) {
        throw new Error("User already exists");
      }
      devLog("📝 addDocument: Document doesn't exist yet, calling set()");
      await ref.set(withMetadata);
      // Re-read to get server-computed fields (Timestamp resolved by server)
      const result = await ref.get();
      devLog(`✅ addDocument: Successfully created document, exists=${result.exists}`);
      return result;
    }

    devLog(`📝 addDocument: Creating auto-ID document in '${collection}'`);
    const docRef = await callFirebase(collection).add(withMetadata);
    devLog(`✅ addDocument: Successfully created auto-ID document with ID=${docRef.id}`);
    // Avoid extra read: construct lightweight snapshot from written data
    // Callers use documentToJson() which only needs .id and .data()
    return {
      id: docRef.id,
      exists: true,
      ref: docRef,
      data: () => withMetadata,
    } as unknown as FirebaseFirestore.DocumentSnapshot;
  } catch (error) {
    devLog(error, "ADD_DOCUMENT_ERROR");
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
 * @return The write result or null on error
 */
export const updateDocument = async <T extends object>(
  collection: string,
  documentUid: string,
  updateData: Partial<T>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = callFirebase(collection).doc(documentUid);

    const {metadata, ...restUpdateData} = updateData as any;
    const updatePayload: Record<string, unknown> = {
      ...restUpdateData,
      "metadata.updated_at": Timestamp.now(),
    };

    if (metadata && typeof metadata === "object") {
      if (Object.prototype.hasOwnProperty.call(metadata, "created_at")) {
        updatePayload["metadata.created_at"] = metadata.created_at;
      }
      if (Object.prototype.hasOwnProperty.call(metadata, "updated_at")) {
        updatePayload["metadata.updated_at"] = metadata.updated_at;
      }
      if (Object.prototype.hasOwnProperty.call(metadata, "deleted_at")) {
        updatePayload["metadata.deleted_at"] = metadata.deleted_at;
      }
    }

    return await docRef.update(updatePayload);
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
 * @return The write result or null on error
 */
export const deleteDocument = async (
  collection: string,
  documentUid: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await callFirebase(collection).doc(documentUid).delete({
      exists: true,
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
  documentContent: string | number
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
 * @return The document ID or null if not found/error
 */
export const getDocumentIdByField = async (
  collection: string,
  field: string,
  value: string | number
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
 * @return The document snapshot or null if not found/error
 */
export const getDocumentByFieldId = async (
  collection: string,
  field: string,
  value: string | number
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
 * @param uid - The document ID
 * @return The document snapshot or null if not found/error
 */
export const getDocumentById = async (
  collection: string,
  uid: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const docSnap = await callFirebase(collection).doc(uid).get();
    if (!docSnap.exists) throw new Error("Document does not exist");

    return docSnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

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
    let queryBuilder: FirebaseFirestore.Query = options.queryModifier ?
      options.queryModifier(dbQueryBase) :
      dbQueryBase;

    // Apply orderBy for each order field (paginateQuery expects the same ordering sequence)
    for (const field of orderFields) {
      queryBuilder = queryBuilder.orderBy(field);
    }

    // Delegate to paginateQuery (it will apply startAfter(token) and limit)
    return await paginateQuery(queryBuilder, limit, token, orderFields);
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

/**
 * Deletes all documents in a Firestore collection using chunked batch deletes.
 * Processes 500 documents at a time to avoid memory issues and Firestore batch limits.
 * @param collection - The name of the Firestore collection to clear
 */
export const deleteCollection = async (collection: string) => {
  const BATCH_SIZE = 500;
  const collectionRef = callFirebase(collection);

  let query = collectionRef.orderBy("__name__").limit(BATCH_SIZE);
  let snapshot = await query.get();

  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    if (snapshot.docs.length < BATCH_SIZE) break;

    // Continue from after the last document
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = collectionRef.orderBy("__name__").startAfter(lastDoc).limit(BATCH_SIZE);
    snapshot = await query.get();
  }
};

/**
 * Returns a reference to a subcollection under a parent document.
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @return The subcollection reference
 */
const getSubcollectionRef = (
  parentCollection: string,
  parentId: string,
  subcollection: string
): FirebaseFirestore.CollectionReference =>
  db.collection(parentCollection).doc(parentId).collection(subcollection);

/**
 * Adds a new document to a subcollection.
 * @template T
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @param document - The document data to add
 * @return The document snapshot or null on error
 */
export const addSubcollectionDocument = async <T extends object>(
  parentCollection: string,
  parentId: string,
  subcollection: string,
  document: T
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const withMetadata: WithMetadata<T> = {
      ...document,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const docRef = await getSubcollectionRef(parentCollection, parentId, subcollection).add(
      withMetadata
    );
    // Avoid extra read: synthetic snapshot
    return {
      id: docRef.id,
      exists: true,
      ref: docRef,
      data: () => withMetadata,
    } as unknown as FirebaseFirestore.DocumentSnapshot;
  } catch (error) {
    devLog(error, "ADD_SUBCOLLECTION_DOCUMENT_ERROR");
    return null;
  }
};

/**
 * Updates a document in a subcollection.
 * @template T
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @param docId - The document ID to update
 * @param updateData - The partial data to update
 * @return The write result or null on error
 */
export const updateSubcollectionDocument = async <T extends object>(
  parentCollection: string,
  parentId: string,
  subcollection: string,
  docId: string,
  updateData: Partial<T>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = getSubcollectionRef(parentCollection, parentId, subcollection).doc(docId);

    const {metadata, ...restUpdateData} = updateData as any;
    const updatePayload: Record<string, unknown> = {
      ...restUpdateData,
      "metadata.updated_at": Timestamp.now(),
    };

    if (metadata && typeof metadata === "object") {
      if (Object.prototype.hasOwnProperty.call(metadata, "created_at")) {
        updatePayload["metadata.created_at"] = metadata.created_at;
      }
      if (Object.prototype.hasOwnProperty.call(metadata, "updated_at")) {
        updatePayload["metadata.updated_at"] = metadata.updated_at;
      }
      if (Object.prototype.hasOwnProperty.call(metadata, "deleted_at")) {
        updatePayload["metadata.deleted_at"] = metadata.deleted_at;
      }
    }

    return await docRef.update(updatePayload);
  } catch (error) {
    devLog(error, "UPDATE_SUBCOLLECTION_DOCUMENT_ERROR");
    return null;
  }
};

/**
 * Retrieves a single document from a subcollection by ID.
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @param docId - The document ID to retrieve
 * @return The document snapshot or null if not found/error
 */
export const getSubcollectionDocumentById = async (
  parentCollection: string,
  parentId: string,
  subcollection: string,
  docId: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const doc = await getSubcollectionRef(parentCollection, parentId, subcollection)
      .doc(docId)
      .get();
    if (!doc.exists) return null;
    return doc;
  } catch (error) {
    devLog(error, "GET_SUBCOLLECTION_DOCUMENT_ERROR");
    return null;
  }
};

/**
 * Retrieves all documents from a subcollection.
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @return Array of document snapshots or empty array on error
 */
export const getAllSubcollectionDocuments = async (
  parentCollection: string,
  parentId: string,
  subcollection: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> => {
  try {
    const snapshot = await getSubcollectionRef(parentCollection, parentId, subcollection)
      .orderBy("metadata.created_at", "asc")
      .get();
    return snapshot.docs;
  } catch (error) {
    devLog(error, "GET_ALL_SUBCOLLECTION_DOCUMENTS_ERROR");
    return [];
  }
};

/**
 * Deletes a document from a subcollection.
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @param docId - The document ID to delete
 * @return The write result or null on error
 */
export const deleteSubcollectionDocument = async (
  parentCollection: string,
  parentId: string,
  subcollection: string,
  docId: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    return await getSubcollectionRef(parentCollection, parentId, subcollection)
      .doc(docId)
      .delete();
  } catch (error) {
    devLog(error, "DELETE_SUBCOLLECTION_DOCUMENT_ERROR");
    return null;
  }
};

/**
 * Counts the total number of documents in a subcollection.
 * @param parentCollection - The parent collection name
 * @param parentId - The parent document ID
 * @param subcollection - The subcollection name
 * @return The document count
 */
export const countSubcollectionDocuments = async (
  parentCollection: string,
  parentId: string,
  subcollection: string
): Promise<number> => {
  try {
    const snap = await getSubcollectionRef(parentCollection, parentId, subcollection)
      .count()
      .get();
    return snap.data().count;
  } catch (error) {
    devLog(error, "COUNT_SUBCOLLECTION_DOCUMENTS_ERROR");
    return 0;
  }
};

export {getFirestore};
