import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { Report } from "../types/types";

const collection = "reports";

export const addReport = async (data: Report) => addDocument(collection, data);
export const findReportById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllReports = async (limit: number, offset: number) =>
  getPaginatedDocuments(collection, limit, offset);
export const updateReport = async (id: string, updatedData: Partial<Report>) =>
  updateDocument(collection, id, updatedData);
export const deleteReport = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteReport = async (id: string) =>
  softDeleteDocument(collection, id);
