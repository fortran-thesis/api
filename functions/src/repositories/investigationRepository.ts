import {
  addDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {Investigation} from "../types/types";
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.INVESTIGATIONS);

export const addInvestigation = async (data: Investigation) =>
  addDocument(collection, data);

export const findInvestigationById = async (id: string) =>
  getDocumentById(collection, id);

export const updateInvestigation = async (id: string, updatedData: Partial<Investigation>) =>
  updateDocument(collection, id, updatedData);

export const deleteInvestigation = async (id: string) => deleteDocument(collection, id);

export const softDeleteInvestigation = async (id: string) =>
  softDeleteDocument(collection, id);
