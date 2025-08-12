import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { SystemRequest } from "../types/types";

const collection = "system_requests";

export const addSystemRequest = async (data: SystemRequest) => addDocument(collection, data);
export const findSystemRequestById = async (id: string) => getDocumentById(collection, id);
export const findAllSystemRequests = async (limit: number, offset: number) => getPaginatedDocuments(collection, limit, offset);
export const updateSystemRequest = async (id: string, updatedData: Partial<SystemRequest>) => updateDocument(collection, id, updatedData);
export const deleteSystemRequest = async (id: string) => deleteDocument(collection, id);
export const softDeleteSystemRequest = async (id: string) => softDeleteDocument(collection, id);
