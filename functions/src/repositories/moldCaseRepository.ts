// All references to moldFolderService and moldFolderRespository should now use moldCaseService and moldCaseRepository.

// ...existing code...
import {FieldPath, FieldValue} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentsByField,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getPaginatedDocuments,
  getDocumentById,
} from "../lib/firestore";
import {MoldCase} from "../types/types";
import {devLog} from "../utils/dev";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";

const collection: string = getCollectionName(FirestoreCollection.MOLD_CASES);

export const addMoldCase = async (data: MoldCase) =>
  addDocument(collection, data);
export const findMoldCaseById = async (id: string) =>
  getDocumentById(collection, id);
export const findMoldCaseByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findMoldCaseByReportId = async (reportId: string) =>
  getDocumentsByField(collection, "mold_report_id", reportId);
export const findAllMoldCases = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    // queryModifier applies your filters before ordering is applied in getPaginatedDocuments
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("user_id", "==", uid).where("is_archived", "==", isArchived);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()], // deterministic ordering by documentId
      {queryModifier}
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const updateMoldCase = async (
  uid: string,
  updatedData: Partial<MoldCase>
) => updateDocument(collection, uid, updatedData);
export const deleteMoldCase = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMoldCase = async (uid: string) =>
  softDeleteDocument(collection, uid);

export const appendCultivationLog = async (
  caseId: string,
  log: any
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    // Use shared updateDocument helper so metadata is preserved and consistent
    return await updateDocument(collection, caseId, {
      cultivation_logs: FieldValue.arrayUnion(log),
    } as any);
  } catch (err) {
    devLog(err);
    return null;
  }
};

export const updateCultivationDetails = async (
  caseId: string,
  details: Partial<any>
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const updates: any = {};
    if (details.in_vivo_details !== undefined) {
      updates["cultivation_details.in_vivo_details"] = details.in_vivo_details;
    }
    if (details.in_vitro_details !== undefined) {
      updates["cultivation_details.in_vitro_details"] = details.in_vitro_details;
    }
    return await updateDocument(collection, caseId, updates);
  } catch (err) {
    devLog(err);
    return null;
  }
};
