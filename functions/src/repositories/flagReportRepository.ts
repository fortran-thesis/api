import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { FlagReport } from "../types/types";

const collection = "flag_reports";

export const addFlagReport = async (data: FlagReport) => addDocument(collection, data);
export const findFlagReportById = async (id: string) => getDocumentById(collection, id);
export const findAllFlagReports = async (limit: number, offset: number) => getPaginatedDocuments(collection, limit, offset);
export const updateFlagReport = async (id: string, updatedData: Partial<FlagReport>) => updateDocument(collection, id, updatedData);
export const deleteFlagReport = async (id: string) => deleteDocument(collection, id);
export const softDeleteFlagReport = async (id: string) => softDeleteDocument(collection, id);
