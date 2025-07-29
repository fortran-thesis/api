import { addDocument, deleteDocument, getDocumentById, getPaginatedDocuments, softDeleteDocument, updateDocument } from "../lib/firestore";
import { ScannedMold } from "../types/types";

const collection = 'scanned_molds'
export const addScannedMold = async (data: ScannedMold) => await addDocument(collection, data)
export const findAllScannedMolds = async (limit: number, offset: number) => await getPaginatedDocuments(collection, limit, offset)
export const findScannedMoldById = async (id: string) => await getDocumentById(collection, id)
export const updateScannedMold = async (id: string, updatedData: Partial<ScannedMold>) => updateDocument(collection, id, updatedData)
export const deleteScannedMold = async (id: string) => deleteDocument(collection, id)
export const softDeleteScannedMold = async (id: string) => softDeleteDocument(collection, id)