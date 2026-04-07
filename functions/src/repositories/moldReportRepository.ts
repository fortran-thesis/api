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
const CLOSED_STATUSES = ["rejected", "closed"];
const HISTORY_STATUSES = ["resolved", "rejected", "closed"];
const OPEN_STATUSES = ["pending", "in progress", "resolved"];

export const addMoldReport = async (data: MoldReport) =>
  addDocument(collection, data);
export const findMoldReportById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMoldReports = async (
  limit: number,
  token?: string,
  statusFilter: "all" | "open" | "closed" | "rejected" = "open"
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) => {
      switch (statusFilter) {
      case "closed":
        return q.where("status", "in", HISTORY_STATUSES);
      case "rejected":
        return q.where("status", "==", "rejected");
      case "all":
        return q; // No status filter
      case "open":
      default:
        return q.where("status", "not-in", CLOSED_STATUSES);
      }
    };

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["status", "metadata.created_at", FieldPath.documentId()],
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const findAllClosedMoldReports = async (
  limit: number,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  return findAllMoldReports(limit, token, "closed");
};

export const findAllRejectedMoldReports = async (
  limit: number,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  return findAllMoldReports(limit, token, "rejected");
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
        query.where("status", "in", HISTORY_STATUSES) :
        query.where("status", "in", OPEN_STATUSES);
      return query;
    };

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
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
  includeHistory: boolean = false,
  token?: string
): Promise<{
  snapshot: FirebaseFirestore.QuerySnapshot;
  nextPageToken: string | null;
} | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) => {
      var query = q.where("assigned_mycologist_id", "==", mycologistId);
      query = includeHistory
        ? query.where("status", "in", HISTORY_STATUSES)
        : query.where("status", "not-in", CLOSED_STATUSES);
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

/**
 * Count all mold reports created today (by UTC date).
 * Used for auto-generating daily sequential case names like MR-YYYY-MM-DD-{n}.
 * Counts ALL reports regardless of status (no status filter).
 */
export const countAllReportsForToday = async (): Promise<number> => {
  try {
    const db = getFirestore(firebase);
    // Get today's midnight UTC boundaries
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const snapshot = await db
      .collection(collection)
      .where("metadata.created_at", ">=", Timestamp.fromDate(todayStart))
      .where("metadata.created_at", "<", Timestamp.fromDate(todayEnd))
      .count()
      .get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return 0;
  }
};

/**
 * Generate the next daily case name atomically using a Firestore transaction.
 * Format: MR-YYYY-MM-DD-#### (UTC date basis)
 */
export const generateNextDailyCaseName = async (): Promise<string> => {
  const db = getFirestore(firebase);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const counterDocId = `daily_counter_${yyyy}_${mm}_${dd}`;
  const counterRef = db.collection("meta").doc(counterDocId);

  const nextCount = await db.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const currentCount = counterSnap.exists ? Number(counterSnap.data()?.count || 0) : 0;
    const incrementedCount = currentCount + 1;

    transaction.set(
      counterRef,
      {
        count: incrementedCount,
        date_key: `${yyyy}-${mm}-${dd}`,
        metadata: {
          updated_at: Timestamp.now(),
          created_at: counterSnap.exists ? (counterSnap.data()?.metadata?.created_at || Timestamp.now()) : Timestamp.now(),
        },
      },
      {merge: true}
    );

    return incrementedCount;
  });

  return `MR-${yyyy}-${mm}-${dd}-${String(nextCount).padStart(4, "0")}`;
};
