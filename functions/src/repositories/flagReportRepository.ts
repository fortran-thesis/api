import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { FlagReportBase } from "../types/types";
import { OrderField } from "../utils/pagination";

const collection = "flag_reports";

export const addFlagReport = async (data: FlagReportBase) => addDocument(collection, data);
export const findFlagReportById = async (id: string) => getDocumentById(collection, id);
export const findAllFlagReports = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "content_id", FieldPath.documentId()]
) => getPaginatedDocuments(collection, limit, token, orderFields);
export const updateFlagReport = async (id: string, updatedData: Partial<FlagReportBase>) => updateDocument(collection, id, updatedData);
export const deleteFlagReport = async (id: string) => deleteDocument(collection, id);
export const softDeleteFlagReport = async (id: string) => softDeleteDocument(collection, id);
