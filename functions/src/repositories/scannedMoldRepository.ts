import {FieldPath} from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentById,
  getPaginatedDocuments,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
} from "../lib/firestore";
import {ScannedMold, ScannedMoldQueryFilters} from "../types/types";
import {OrderField} from "../utils/pagination";
import {
  getCollectionName,
  FirestoreCollection,
} from "../types/models/firestoreCollections";

const collection = getCollectionName(FirestoreCollection.SCANNED_MOLDS);

export const addScannedMold = async (data: ScannedMold) =>
  addDocument(collection, data);
export const findScannedMoldById = async (id: string) =>
  getDocumentById(collection, id);
export const findAllScannedMolds = async (
  limit: number,
  token?: string,
  filters?: ScannedMoldQueryFilters,
  orderFields: OrderField[] = [
    "metadata.created_at",
    "user_id",
    FieldPath.documentId(),
  ]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields, {
    queryModifier: (query) => {
      let next = query;
      if (filters?.mold_case_id) {
        next = next.where("mold_case_id", "==", filters.mold_case_id);
      }
      if (filters?.scan_modality) {
        next = next.where("scan_modality", "==", filters.scan_modality);
      }
      return next;
    },
  });
export const updateScannedMold = async (
  id: string,
  updatedData: Partial<ScannedMold>
) => updateDocument(collection, id, updatedData);
export const deleteScannedMold = async (id: string) =>
  deleteDocument(collection, id);
export const softDeleteScannedMold = async (id: string) =>
  softDeleteDocument(collection, id);
