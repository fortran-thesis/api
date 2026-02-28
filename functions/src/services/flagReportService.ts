import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addFlagReport,
  deleteFlagReport,
  findAllFlagReports,
  findFlagReportById,
  softDeleteFlagReport,
  updateFlagReport,
} from "../repositories/flagReportRepository";
import {FlagReportBase, PaginatedResult, WithMetadata} from "../types/types";

export const addFlagReportToFirestore = async (
  details: FlagReportBase
): Promise<FlagReportBase | null> => {
  try {
    const detailsWithTimestamp: WithMetadata<FlagReportBase> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addFlagReport(detailsWithTimestamp);
    if (!doc) throw new Error("Cannot add flag report.");
    return documentToJson<FlagReportBase>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllFlagReports = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<FlagReportBase[]> | null> => {
  try {
    const querySnap: PaginatedResult<QuerySnapshot> | null =
      await findAllFlagReports(limit, token);
    if (!querySnap) {
      devLog("[flagReportService] Query error - possible missing Firestore composite index");
      return null;
    }
    // Return empty result set if no documents found (this is valid, not an error)
    return {
      snapshot: queryToJson<FlagReportBase>(querySnap.snapshot),
      nextPageToken: querySnap.nextPageToken,
    };
  } catch (error) {
    devLog("[flagReportService] Error retrieving flag reports");
    return null;
  }
};

export const retrieveFlagReportById = async (id: string) => {
  try {
    const doc: DocumentSnapshot | null = await findFlagReportById(id);
    if (!doc || !doc.exists) throw new Error("Flag report not found.");
    return documentToJson<FlagReportBase>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateFlagReportInFirestore = async (
  id: string,
  details: Partial<FlagReportBase>
) => {
  try {
    const result: WriteResult | null = await updateFlagReport(id, details);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const removeFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await deleteFlagReport(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await softDeleteFlagReport(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};
