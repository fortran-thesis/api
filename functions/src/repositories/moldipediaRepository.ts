import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { Moldipedia } from "../types/types";
import { OrderField } from "../utils/pagination";
import { getCollectionName, FirestoreCollection } from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.MOLDIPEDIA);

export const addMoldipedia = async (data: Moldipedia) =>
  addDocument(collection, data);
export const findMoldipediaById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMoldipedia = async (
  limit: number, 
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "author_id", FieldPath.documentId()]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields);
export const updateMoldipedia = async (
  id: string,
  updatedData: Partial<Moldipedia>
) => updateDocument(collection, id, updatedData);
export const deleteMoldipedia = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteMoldipedia = async (id: string) =>
  softDeleteDocument(collection, id);
