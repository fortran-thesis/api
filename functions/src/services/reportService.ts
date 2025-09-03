import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addReport,
  deleteReport,
  findAllReports,
  findReportById,
  softDeleteReport,
  updateReport,
} from "../repositories/reportRepository";
import { PaginatedResult, Report, WithMetadata } from "../types/types";

export const addReportToFirestore = async (
  details: Report
): Promise<Report | null> => {
  try {
    const detailsWithTimestamp: WithMetadata<Report> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null = await addReport(detailsWithTimestamp);
    if (!doc) throw new Error("Cannot add report.");
    return documentToJson<Report>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllReports = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<Report[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllReports(limit, token);
    if (!docs) throw new Error("No reports found.");
    return { snapshot: queryToJson<Report>(docs.snapshot), nextPageToken: docs.nextPageToken };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveReportById = async (
  id: string
): Promise<Report | null> => {
  try {
    const doc: DocumentSnapshot | null = await findReportById(id);
    if (!doc) throw new Error("No report found.");
    return documentToJson<Report>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateReportInFirestore = async (
  id: string,
  details: Partial<Report>
): Promise<Report | null> => {
  try {
    const result: WriteResult | null = await updateReport(id, details);
    if (!result) throw new Error("Failed to update report.");
    const updated = await retrieveReportById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveReport = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteReport(id);
    if (!result) throw new Error("Failed to soft delete report");
  } catch (error) {
    devLog(error);
  }
};

export const removeReport = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteReport(id);
    if (!result) throw new Error("Failed to delete report");
  } catch (error) {
    devLog(error);
  }
};
