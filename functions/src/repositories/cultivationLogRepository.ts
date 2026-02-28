import {Timestamp} from "firebase-admin/firestore";
import {getDb} from "../lib/firestore";
import {CultivationLog} from "../types/types";
import {devLog} from "../utils/dev";
import {
  FirestoreCollection,
  FirestoreSubcollection,
  getCollectionName,
} from "../types/models/firestoreCollections";
import {WithMetadata} from "../types/types";

const parentCollection = getCollectionName(FirestoreCollection.MOLD_CASES);
const subcollection = FirestoreSubcollection.CULTIVATION_LOGS;

/**
 * Returns a reference to the cultivation_logs subcollection under a mold case.
 */
const logsRef = (caseId: string) =>
  getDb().collection(parentCollection).doc(caseId).collection(subcollection);

/**
 * Add a cultivation log document to the subcollection.
 */
export const addCultivationLog = async (
  caseId: string,
  log: CultivationLog
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const withMetadata: WithMetadata<CultivationLog> = {
      ...log,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const docRef = await logsRef(caseId).add(withMetadata);
    // Return synthetic snapshot to avoid extra read (matches addDocument pattern)
    return {
      id: docRef.id,
      exists: true,
      ref: docRef,
      data: () => withMetadata,
    } as unknown as FirebaseFirestore.DocumentSnapshot;
  } catch (err) {
    devLog(err, "ADD_CULTIVATION_LOG_ERROR");
    return null;
  }
};

/**
 * Retrieve a single cultivation log by its document ID.
 */
export const findCultivationLogById = async (
  caseId: string,
  logId: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const doc = await logsRef(caseId).doc(logId).get();
    if (!doc.exists) return null;
    return doc;
  } catch (err) {
    devLog(err, "FIND_CULTIVATION_LOG_ERROR");
    return null;
  }
};

/**
 * Retrieve all cultivation logs for a case, ordered by creation date (desc).
 * Supports cursor-based pagination.
 */
export const findCultivationLogsByCaseId = async (
  caseId: string,
  limit: number,
  token?: string
): Promise<{
  docs: FirebaseFirestore.QueryDocumentSnapshot[];
  nextPageToken: string | null;
} | null> => {
  try {
    let query: FirebaseFirestore.Query = logsRef(caseId)
      .orderBy("metadata.created_at", "desc")
      .limit(limit + 1);

    if (token) {
      const startDoc = await logsRef(caseId).doc(token).get();
      if (startDoc.exists) {
        query = logsRef(caseId)
          .orderBy("metadata.created_at", "desc")
          .startAfter(startDoc)
          .limit(limit + 1);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit);
    const nextPageToken =
      snapshot.docs.length > limit ? docs[docs.length - 1].id : null;

    return {docs, nextPageToken};
  } catch (err) {
    devLog(err, "FIND_CULTIVATION_LOGS_ERROR");
    return null;
  }
};

/**
 * Delete a cultivation log document by ID.
 */
export const deleteCultivationLog = async (
  caseId: string,
  logId: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = logsRef(caseId).doc(logId);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return await docRef.delete();
  } catch (err) {
    devLog(err, "DELETE_CULTIVATION_LOG_ERROR");
    return null;
  }
};

/**
 * Count the total number of cultivation logs for a given case.
 */
export const countCultivationLogsByCaseId = async (
  caseId: string
): Promise<number> => {
  try {
    const snap = await logsRef(caseId).count().get();
    return snap.data().count;
  } catch (err) {
    devLog(err, "COUNT_CULTIVATION_LOGS_ERROR");
    return 0;
  }
};
