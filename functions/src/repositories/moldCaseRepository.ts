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

export const findAssignedMoldCases = async (
  mycologistId: string,
  limit: number,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    // Find all mold cases assigned to the given mycologist (curator)
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("mycologist_id", "==", mycologistId).where("is_archived", "==", false);

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

export const findMoldCasesByPriority = async (
  priority: string
): Promise<string[]> => {
  try {
    const result = await getDocumentsByField(collection, "priority", priority);
    if (!result) return [];

    // Extract mold_report_id from each case
    const reportIds: string[] = [];
    result.forEach((doc) => {
      const data = doc.data();
      if (data?.mold_report_id) {
        reportIds.push(data.mold_report_id);
      }
    });

    return reportIds;
  } catch (err) {
    devLog(err);
    return [];
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

    // If the entire cultivation_details object is provided, use it directly
    if (details.cultivation_details !== undefined) {
      updates["cultivation_details"] = details.cultivation_details;
    } else {
      // Otherwise, build the nested path updates for individual fields
      if (details.growth_medium !== undefined) {
        updates["cultivation_details.growth_medium"] = details.growth_medium;
      }
      if (details.in_vivo_details !== undefined) {
        updates["cultivation_details.in_vivo_details"] = details.in_vivo_details;
      }
      if (details.in_vitro_details !== undefined) {
        updates["cultivation_details.in_vitro_details"] = details.in_vitro_details;
      }
    }

    // Also handle start_date and end_date if provided (they're outside cultivation_details)
    if (details.start_date !== undefined) {
      updates["start_date"] = details.start_date;
    }
    if (details.end_date !== undefined) {
      updates["end_date"] = details.end_date;
    }

    return await updateDocument(collection, caseId, updates);
  } catch (err) {
    devLog(err);
    return null;
  }
};
