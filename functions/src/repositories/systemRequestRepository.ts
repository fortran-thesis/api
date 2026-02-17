import {FieldPath} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {SystemRequest} from "../types/types";
import {OrderField} from "../utils/pagination";
import {
  getCollectionName,
  FirestoreCollection,
} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.SYSTEM_REQUESTS);

export const addSystemRequest = async (data: SystemRequest) =>
  addDocument(collection, data);
export const findSystemRequestById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllSystemRequests = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = [
    "metadata.created_at",
    "user_id",
    FieldPath.documentId(),
  ]
) => getPaginatedDocuments(collection, limit, token, orderFields);
export const updateSystemRequest = async (
  id: string,
  updatedData: Partial<SystemRequest>
) => updateDocument(collection, id, updatedData);
export const deleteSystemRequest = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteSystemRequest = async (id: string) =>
  softDeleteDocument(collection, id);
