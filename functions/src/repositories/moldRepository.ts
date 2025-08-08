import {
  addDocument,
  deleteDocument,
  getDocumentsByField,
  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import { Mold } from "../types/types";

const collection: string = "molds";

export const addMold = async (data: Mold) => addDocument(collection, data);
export const findMoldById = async (id: string) =>
  getDocumentsByField(collection, "id", id);
export const findMoldByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findAllMolds = async (limit: number, offset: number) =>
  getPaginatedDocuments(collection, limit, offset);
export const updateMold = async (uid: string, updatedData: Partial<Mold>) =>
  updateDocument(collection, uid, updatedData);
export const deleteMold = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMold = async (uid: string) =>
  softDeleteDocument(collection, uid);
