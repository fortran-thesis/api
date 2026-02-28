import {FieldPath, getFirestore} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {firebase} from "../configs/firebase";
import {MoldReport} from "../types/types";
import {devLog} from "../utils/dev";
import {
  getCollectionName,
  FirestoreCollection,
} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.MOLD_REPORTS);

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
    // Filter at the DB level: archived docs have metadata.deleted_at set (non-null)
    // Non-archived docs have metadata.deleted_at == null
    const queryModifier = isArchived ?
      (q: FirebaseFirestore.Query) =>
        q.where("metadata.deleted_at", "!=", null) :
      (q: FirebaseFirestore.Query) =>
        q.where("metadata.deleted_at", "==", null);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
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
      return q
        .where("user_id", "==", uid)
        .where("is_archived", "==", isArchived);
    };

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
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
        .where("is_archived", "==", false);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
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
        .where("is_archived", "==", false);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
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
export const appendCaseDetail = async (id: string, caseDetail: any) => {
  try {
    const doc = await getDocumentById(collection, id);
    if (!doc) throw new Error("No document found");
    const data = doc.data() as any;
    const existing: any[] = Array.isArray(data?.case_details) ?
      data.case_details :
      [];
    const updated = [...existing, caseDetail];
    return updateDocument(collection, id, {
      case_details: updated,
    } as Partial<MoldReport>);
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const deleteMoldReport = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteMoldReport = async (id: string) =>
  softDeleteDocument(collection, id);

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
      let query = q.where("is_archived", "==", false);

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
      ["metadata.created_at", FieldPath.documentId()],
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
      .where("is_archived", "==", false)
      .count()
      .get();
    return snapshot.data().count;
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const countReportsByDateRange = async (
  startTimestamp: any,
  endTimestamp: any
): Promise<number | null> => {
  try {
    const db = getFirestore(firebase);
    const snapshot = await db
      .collection(collection)
      .where("is_archived", "==", false)
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