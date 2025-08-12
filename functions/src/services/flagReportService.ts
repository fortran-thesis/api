import { DocumentSnapshot, QuerySnapshot, Timestamp, WriteResult } from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addFlagReport,
  deleteFlagReport,
  findAllFlagReports,
  findFlagReportById,
  softDeleteFlagReport,
  updateFlagReport,
} from "../repositories/flagReportRepository";
import { FlagReport, WithMetadata } from "../types/types";

export const addFlagReportToFirestore = async (
  details: FlagReport
): Promise<FlagReport | null> => {
  try {
    const detailsWithTimestamp: WithMetadata<FlagReport> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null = await addFlagReport(detailsWithTimestamp);
    if (!doc) throw new Error("Cannot add flag report.");
    return documentToJson<FlagReport>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllFlagReports = async (limit: number, offset: number) => {
  try {
    const querySnap: QuerySnapshot | null = await findAllFlagReports(limit, offset);
    if (!querySnap) throw new Error("No flag reports found.");
    return queryToJson<FlagReport>(querySnap);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveFlagReportById = async (id: string) => {
  try {
    const querySnap: QuerySnapshot | null = await findFlagReportById(id);
    if (!querySnap || querySnap.empty) throw new Error("Flag report not found.");
    return queryToJson<FlagReport>(querySnap)[0];
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateFlagReportInFirestore = async (id: string, details: Partial<FlagReport>) => {
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
