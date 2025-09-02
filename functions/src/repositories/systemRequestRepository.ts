import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { SystemRequest } from "../types/types";
import { OrderField } from "../utils/pagination";

const collection = "system_requests";

export const addSystemRequest = async (data: SystemRequest) => addDocument(collection, data);
export const findSystemRequestById = async (id: string) => getDocumentById(collection, id);
export const findAllSystemRequests = async (
  limit: number, 
  token?: string, 
  orderFields: OrderField[] = ["metadata.created_at", "userId", FieldPath.documentId()]) => getPaginatedDocuments(collection, limit, token, orderFields);
export const updateSystemRequest = async (id: string, updatedData: Partial<SystemRequest>) => updateDocument(collection, id, updatedData);
export const deleteSystemRequest = async (id: string) => deleteDocument(collection, id);
export const softDeleteSystemRequest = async (id: string) => softDeleteDocument(collection, id);
