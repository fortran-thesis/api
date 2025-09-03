import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { Report } from "../types/types";
import { OrderField } from "../utils/pagination";
import { getCollectionName, FirestoreCollection } from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.REPORTS);

export const addReport = async (data: Report) => addDocument(collection, data);
export const findReportById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllReports = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "reporter_id", FieldPath.documentId()]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields);
export const updateReport = async (id: string, updatedData: Partial<Report>) =>
  updateDocument(collection, id, updatedData);
export const deleteReport = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteReport = async (id: string) =>
  softDeleteDocument(collection, id);
