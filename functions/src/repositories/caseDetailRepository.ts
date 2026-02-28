import {Timestamp} from "firebase-admin/firestore";
import {getDb} from "../lib/firestore";
import {MoldReportDetails, WithMetadata} from "../types/types";
import {devLog} from "../utils/dev";
import {
  FirestoreCollection,
  FirestoreSubcollection,
  getCollectionName,
} from "../types/models/firestoreCollections";


const parentCollection = getCollectionName(FirestoreCollection.MOLD_REPORTS);
const subcollection = FirestoreSubcollection.CASE_DETAILS;

/**
 * Returns a reference to the case_details subcollection under a mold report.
 */
const detailsRef = (reportId: string) =>
  getDb().collection(parentCollection).doc(reportId).collection(subcollection);

/**
 * Add a case detail document to the subcollection.
 */
export const addCaseDetail = async (
  reportId: string,
  detail: MoldReportDetails
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const withMetadata: WithMetadata<MoldReportDetails> = {
      ...detail,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const docRef = await detailsRef(reportId).add(withMetadata);
    // Avoid extra read: synthetic snapshot (same pattern as addDocument)
    return {
      id: docRef.id,
      exists: true,
      ref: docRef,
      data: () => withMetadata,
    } as unknown as FirebaseFirestore.DocumentSnapshot;
  } catch (err) {
    devLog(err, "ADD_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Retrieve a single case detail by its document ID.
 */
export const findCaseDetailById = async (
  reportId: string,
  detailId: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> => {
  try {
    const doc = await detailsRef(reportId).doc(detailId).get();
    if (!doc.exists) return null;
    return doc;
  } catch (err) {
    devLog(err, "FIND_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Retrieve all case details for a report, ordered by creation date (asc).
 * Supports cursor-based pagination.
 */
export const findCaseDetailsByReportId = async (
  reportId: string,
  limit: number,
  token?: string
): Promise<{
  docs: FirebaseFirestore.QueryDocumentSnapshot[];
  nextPageToken: string | null;
} | null> => {
  try {
    let query: FirebaseFirestore.Query = detailsRef(reportId)
      .orderBy("metadata.created_at", "asc")
      .limit(limit + 1);

    if (token) {
      const startDoc = await detailsRef(reportId).doc(token).get();
      if (startDoc.exists) {
        query = detailsRef(reportId)
          .orderBy("metadata.created_at", "asc")
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
    devLog(err, "FIND_CASE_DETAILS_ERROR");
    return null;
  }
};

/**
 * Delete a case detail document by ID.
 */
export const deleteCaseDetail = async (
  reportId: string,
  detailId: string
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const docRef = detailsRef(reportId).doc(detailId);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return await docRef.delete();
  } catch (err) {
    devLog(err, "DELETE_CASE_DETAIL_ERROR");
    return null;
  }
};

/**
 * Count the total number of case details for a given report.
 */
export const countCaseDetailsByReportId = async (
  reportId: string
): Promise<number> => {
  try {
    const snap = await detailsRef(reportId).count().get();
    return snap.data().count;
  } catch (err) {
    devLog(err, "COUNT_CASE_DETAILS_ERROR");
    return 0;
  }
};

/**
 * Retrieve ALL case details for a report (no pagination, for backward-compat detail views).
 */
export const findAllCaseDetailsByReportId = async (
  reportId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> => {
  try {
    const snapshot = await detailsRef(reportId)
      .orderBy("metadata.created_at", "asc")
      .get();
    return snapshot.docs;
  } catch (err) {
    devLog(err, "FIND_ALL_CASE_DETAILS_ERROR");
    return [];
  }
};
