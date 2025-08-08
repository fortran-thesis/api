import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument
} from "../lib/firestore";
import { ScannedMold } from "../types/types";

const collection = "scanned_molds";

export const addScannedMold = async (data: ScannedMold) => addDocument(collection, data);
export const findScannedMoldById = async (id: string) => getDocumentById(collection, id);
export const findAllScannedMolds = async (limit: number, offset: number) => getPaginatedDocuments(collection, limit, offset);
export const updateScannedMold = async (id: string, updatedData: Partial<ScannedMold>) => updateDocument(collection, id, updatedData);
export const deleteScannedMold = async (id: string) => deleteDocument(collection, id);
export const softDeleteScannedMold = async (id: string) => softDeleteDocument(collection, id);
