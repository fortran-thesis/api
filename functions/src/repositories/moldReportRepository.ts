import {FieldPath, getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
} from "../lib/firestore";
import {firebase} from "../configs/firebase";
import {MoldReport} from "../types/types";
import {devLog} from "../utils/dev";
import {
  getCollectionName,
  FirestoreCollection,
} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.MOLD_REPORTS);
const CLOSED_STATUSES = ["closed", "rejected"];

export const addMoldReport = async (data: MoldReport) =>
  addDocument(collection, data);
export const findMoldReportById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMoldReports = async (
  limit: number,
  token?: string,
  isArchived = false
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    // Backward-compatible param name: isArchived=true means closed/rejected reports
    const queryModifier = (q: FirebaseFirestore.Query) =>
      isArchived ?
        q.where("status", "in", CLOSED_STATUSES) :
        q.where("status", "not-in", CLOSED_STATUSES);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      // "status" must be first because not-in is an inequality filter
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const findAllMoldReportsByUser = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) => {
      let query = q.where("user_id", "==", uid);
      query = isArchived ?
        query.where("status", "in", CLOSED_STATUSES) :
        query.where("status", "not-in", CLOSED_STATUSES);
      return query;
    };

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      // "status" must be first because not-in is an inequality filter
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const findUnassignedMoldReports = async (
  limit: number,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q
        .where("assigned_mycologist_id", "==", null)
        .where("status", "not-in", CLOSED_STATUSES);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      // "status" must be first because not-in is an inequality filter
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const findReportsByAssignedMycologist = async (
  mycologistId: string,
  limit: number,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q
        .where("assigned_mycologist_id", "==", mycologistId)
        .where("status", "not-in", CLOSED_STATUSES);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      // "status" must be first because not-in is an inequality filter
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const updateMoldReport = async (
  id: string,
  updatedData: Partial<MoldReport>
) => updateDocument(collection, id, updatedData);
// case detail operations moved to caseDetailRepository (subcollection)
export const deleteMoldReport = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteMoldReport = async (id: string) =>
  updateDocument(collection, id, {
    status: "closed",
    metadata: {
      deleted_at: Timestamp.now(),
    },
  } as any);

export const findMoldReportsBySearch = async (
  limit: number,
  token?: string,
  status?: string,
  reportIds?: string[],
  userId?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) => {
      let query = q.where("status", "not-in", CLOSED_STATUSES);

      if (userId) {
        query = query.where("user_id", "==", userId);
      }

      if (status) {
        query = query.where("status", "==", status);
      }

      // If priority filter is used (reportIds provided), filter by document IDs
      // Note: Firestore 'in' operator has a limit of 10 items, so we handle this in the service layer
      if (reportIds && reportIds.length > 0) {
        // Take only first 10 for Firestore 'in' limitation
        const idsToQuery = reportIds.slice(0, 10);
        query = query.where(FieldPath.documentId(), "in", idsToQuery);
      }

      return query;
    };

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      // "status" must be first because not-in is an inequality filter
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};

// Replace these 4 functions in moldReportRepository.ts:

export const countReportsByStatuses = async (
  statuses: string[],
  userId?: string
): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    let query: FirebaseFirestore.Query = db.collection(collection).where("status", "in", statuses);

    if (userId) {
      query = query.where("user_id", "==", userId);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const countTotalReports = async (userId?: string): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    let query: FirebaseFirestore.Query = db.collection(collection);

    if (userId) {
      query = query.where("user_id", "==", userId);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const countReportsByAssignedMycologist = async (
  mycologistId: string
): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    const snapshot = await db
      .collection(collection)
      .where("assigned_mycologist_id", "==", mycologistId)
      .where("status", "not-in", CLOSED_STATUSES)
      .count()
      .get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const countReportsByDateRange = async (
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    const snapshot = await db
      .collection(collection)
      .where("status", "not-in", CLOSED_STATUSES)
      .where("metadata.created_at", ">=", startTimestamp)
      .where("metadata.created_at", "<", endTimestamp)
      .count()
      .get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return null;
  }
};
