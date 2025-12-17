import {FieldPath} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {FAQ} from "../types/types";
import {OrderField} from "../utils/pagination";
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.FAQ);

export const addFAQ = async (data: FAQ) =>
  addDocument(collection, data);
export const findFAQById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllFAQ = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", FieldPath.documentId()]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields);
export const updateFAQ = async (
  id: string,
  updatedData: Partial<FAQ>
) => updateDocument(collection, id, updatedData);
export const deleteFAQ = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteFAQ = async (id: string) =>
  softDeleteDocument(collection, id);
