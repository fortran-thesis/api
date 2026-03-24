// All references to moldFolderService and moldFolderRespository should now use moldCaseService and moldCaseRepository.

// ...existing code...
import {FieldPath, getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentsByField,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getPaginatedDocuments,
  getDocumentById,
} from "../lib/firestore";
import {CultivationDetails, MoldCase} from "../types/types";
import {devLog} from "../utils/dev";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";
import {firebase} from "../configs/firebase";

const collection: string = getCollectionName(FirestoreCollection.MOLD_CASES);

export const addMoldCase = async (data: MoldCase) =>
  addDocument(collection, data);
export const findMoldCaseById = async (id: string) =>
  getDocumentById(collection, id);
export const findMoldCaseByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findMoldCaseByReportId = async (reportId: string) =>
  getDocumentsByField(collection, "mold_report_id", reportId);

export const findMoldCasesByMoldipediaId = async (
  moldipediaId: string
): Promise<FirebaseFirestore.QuerySnapshot | null> => {
  try {
    const querySnap = await getFirestore(firebase)
      .collection(collection)
      .where("final_verdict.moldipedia_id", "==", moldipediaId)
      .get();
    if (querySnap.empty) {
      return null;
    }
    return querySnap;
  } catch (error) {
    devLog(error);
    return null;
  }
};

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

// cultivation log operations moved to cultivationLogRepository (subcollection)

/** Shape accepted by the cultivation-details PATCH endpoint */
export interface CultivationDetailsUpdate {
  cultivation_details?: Partial<CultivationDetails>;
  growth_medium?: string;
  in_vivo_details?: CultivationDetails["in_vivo_details"];
  in_vitro_details?: CultivationDetails["in_vitro_details"];
  start_date?: Timestamp;
  end_date?: Timestamp;
}

export const updateCultivationDetails = async (
  caseId: string,
  details: CultivationDetailsUpdate
): Promise<FirebaseFirestore.WriteResult | null> => {
  try {
    const updates: Record<string, unknown> = {};

    // If the entire cultivation_details object is provided, merge it with
    // existing cultivation details to avoid dropping unspecified fields.
    if (details.cultivation_details !== undefined) {
      const existingCase = await findMoldCaseById(caseId);
      const existingRaw = existingCase?.data()?.cultivation_details;
      const existingDetails =
        (existingRaw && typeof existingRaw === "object") ?
          (existingRaw as Record<string, unknown>) :
          {};
      const incomingDetails = details.cultivation_details as Record<string, unknown>;
      const mergedDetails: Record<string, unknown> = {
        ...existingDetails,
        ...incomingDetails,
      };

      // Preserve nested structures during partial updates.
      const mergeNestedObject = (key: string) => {
        const existingValue = existingDetails[key];
        const incomingValue = incomingDetails[key];
        if (
          existingValue &&
          typeof existingValue === "object" &&
          !Array.isArray(existingValue) &&
          incomingValue &&
          typeof incomingValue === "object" &&
          !Array.isArray(incomingValue)
        ) {
          mergedDetails[key] = {
            ...(existingValue as Record<string, unknown>),
            ...(incomingValue as Record<string, unknown>),
          };
        }
      };

      mergeNestedObject("in_vivo_details");
      mergeNestedObject("in_vitro_details");
      mergeNestedObject("initial_observations");
      mergeNestedObject("microscopic_ai_snapshot");

      // Keep top-level and nested initial observation image keys aligned.
      const initialObservationsRaw = mergedDetails.initial_observations;
      const initialObservations =
        (initialObservationsRaw && typeof initialObservationsRaw === "object" && !Array.isArray(initialObservationsRaw)) ?
          {...(initialObservationsRaw as Record<string, unknown>)} :
          {};

      const syncAlias = (topLevelKey: string, nestedKey: string) => {
        const topValue = mergedDetails[topLevelKey];
        const nestedValue = initialObservations[nestedKey];

        if (typeof topValue === "string" && topValue.trim().length > 0 && !nestedValue) {
          initialObservations[nestedKey] = topValue;
        }

        if (typeof nestedValue === "string" && nestedValue.trim().length > 0 && !topValue) {
          mergedDetails[topLevelKey] = nestedValue;
        }
      };

      syncAlias("initial_microscopic_image_url", "initial_microscopic_image_url");
      syncAlias("initial_macroscopic_image_url", "initial_macroscopic_image_url");
      syncAlias("microscopic_image_url", "microscopic_image_url");
      syncAlias("macroscopic_image_url", "macroscopic_image_url");
      syncAlias("microscopic_image_path", "microscopic_image_path");
      syncAlias("macroscopic_image_path", "macroscopic_image_path");

      if (Object.keys(initialObservations).length > 0) {
        mergedDetails.initial_observations = initialObservations;
      }

      const microIds = (mergedDetails.scanned_microscopic_ids as unknown[] | undefined);
      if (Array.isArray(microIds)) {
        mergedDetails.scanned_microscopic_ids =
          Array.from(new Set(microIds.map((id) => String(id).trim()).filter((id) => id.length > 0)));
      }

      const macroIds = (mergedDetails.scanned_macroscopic_ids as unknown[] | undefined);
      if (Array.isArray(macroIds)) {
        mergedDetails.scanned_macroscopic_ids =
          Array.from(new Set(macroIds.map((id) => String(id).trim()).filter((id) => id.length > 0)));
      }

      updates["cultivation_details"] = mergedDetails;
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

    return await updateDocument(collection, caseId, updates as Partial<MoldCase>);
  } catch (err) {
    devLog(err);
    return null;
  }
};

/**
 * Count mold cases by priority level
 * @returns Promise with counts for low, medium, and high priority cases
 */
export const countCasesByPriority = async (): Promise<{low: number; medium: number; high: number} | null> => {
  try {
    const db = getFirestore(firebase);
    const col = db.collection(collection);

    const [lowSnap, mediumSnap, highSnap] = await Promise.all([
      col.where("priority", "==", "low").count().get(),
      col.where("priority", "==", "medium").count().get(),
      col.where("priority", "==", "high").count().get(),
    ]);

    return {
      low: lowSnap.data().count,
      medium: mediumSnap.data().count,
      high: highSnap.data().count,
    };
  } catch (err) {
    devLog(err);
    return null;
  }
};
/**
 * Search and filter mold cases assigned to a mycologist
 * Supports searching by name and filtering by priority
 */
export const findAssignedMoldCasesWithSearch = async (
  mycologistId: string,
  searchQuery?: string,
  priority?: string,
  limit = 10,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    const db = getFirestore(firebase);

    let query: FirebaseFirestore.Query = db.collection(collection)
      .where("mycologist_id", "==", mycologistId)
      .where("is_archived", "==", false);

    // Filter by priority if provided
    if (priority) {
      query = query.where("priority", "==", priority);
    }

    // Order by creation date
    query = query.orderBy("metadata.created_at", "desc").orderBy(FieldPath.documentId());

    // Apply pagination
    let docs = await query.limit(limit + 1).get();

    if (token) {
      const startDocSnapshot = await db.collection(collection).doc(token).get();
      if (startDocSnapshot.exists) {
        docs = await query.startAfter(startDocSnapshot).limit(limit + 1).get();
      }
    }

    // Filter by search query on case name if provided
    if (searchQuery && searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const filtered = docs.docs.filter((doc) => {
        const data = doc.data() as MoldCase;
        const caseName = data.name?.toLowerCase() || "";
        return caseName.includes(queryLower);
      });

      // Reconstruct QuerySnapshot-like object with filtered docs
      return {
        snapshot: {
          docs: filtered.slice(0, limit),
          size: filtered.length,
          empty: filtered.length === 0,
          query: docs.query,
          docChanges: () => [],
          forEach: (callback: any) => filtered.forEach((d) => callback({doc: () => d})),
        } as any,
        nextPageToken: filtered.length > limit ? filtered[limit - 1].id : null,
      };
    }

    return {
      snapshot: docs,
      nextPageToken: docs.docs.length > limit ? docs.docs[limit - 1].id : null,
    };
  } catch (err) {
    devLog(err);
    return null;
  }
};

/**
 * Count all mold cases and get metadata (latest createdAt)
 * Admin only endpoint
 */
export const countAllMoldCasesWithMetadata = async (): Promise<{
  count: number;
  createdAt: string;
} | null> => {
  try {
    const db = getFirestore(firebase);
    const snapshot = await db.collection(collection)
      .orderBy("metadata.created_at", "desc")
      .limit(1)
      .get();

    // Get total count separately
    const allDocs = await db.collection(collection).count().get();
    const totalCount = allDocs.data().count;

    // Get the latest createdAt timestamp
    let latestCreatedAt = new Date().toISOString();
    if (!snapshot.empty) {
      const latestDoc = snapshot.docs[0];
      const createdAtField = latestDoc.data()?.metadata?.created_at;
      if (createdAtField) {
        // Convert Firestore Timestamp to ISO string if needed
        latestCreatedAt = createdAtField instanceof Date ?
          createdAtField.toISOString() :
          createdAtField.toDate?.().toISOString?.() || new Date().toISOString();
      }
    }

    return {
      count: totalCount,
      createdAt: latestCreatedAt,
    };
  } catch (err) {
    devLog(err);
    return null;
  }
};

