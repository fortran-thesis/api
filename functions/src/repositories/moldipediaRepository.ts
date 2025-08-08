import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import { Moldipedia } from "../types/types";

const collection = "moldipedia";

export const addMoldipedia = async (data: Moldipedia) =>
  addDocument(collection, data);
export const findMoldipediaById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllMoldipedia = async (limit: number, offset: number) =>
  getPaginatedDocuments(collection, limit, offset);
export const updateMoldipedia = async (
  id: string,
  updatedData: Partial<Moldipedia>
) => updateDocument(collection, id, updatedData);
export const deleteMoldipedia = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteMoldipedia = async (id: string) =>
  softDeleteDocument(collection, id);
