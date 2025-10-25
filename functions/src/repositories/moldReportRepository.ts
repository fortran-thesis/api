import {FieldPath} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {MoldReport} from "../types/types";
import {devLog} from "../utils/dev";
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.MOLD_REPORTS);

export const addMoldReport = async (data: MoldReport) =>
  addDocument(collection, data);
export const findMoldReportById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMoldReports = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("user_id", "==", uid).where("is_archived", "==", isArchived);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
      { queryModifier }
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
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("assigned_mycologist_id", "==", null).where("is_archived", "==", false);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
      { queryModifier }
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
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("assigned_mycologist_id", "==", mycologistId).where("is_archived", "==", false);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()],
      { queryModifier }
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const updateMoldReport = async (id: string, updatedData: Partial<MoldReport>) =>
  updateDocument(collection, id, updatedData);
export const appendCaseDetail = async (id: string, caseDetail: any) => {
  try {
    const doc = await getDocumentById(collection, id);
    if (!doc) throw new Error("No document found");
    const data = doc.data() as any;
    const existing: any[] = Array.isArray(data?.case_details) ? data.case_details : [];
    const updated = [...existing, caseDetail];
    return updateDocument(collection, id, { case_details: updated } as Partial<MoldReport>);
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const deleteMoldReport = async (id: string) => deleteDocument(collection, id);
export const softDeleteMoldReport = async (id: string) =>
  softDeleteDocument(collection, id);
