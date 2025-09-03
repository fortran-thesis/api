import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentsByField,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getPaginatedDocuments,
  getDocumentById,
} from "../lib/firestore";
import { MoldFolder } from "../types/types";
import { devLog } from "../utils/dev";
import { FirestoreCollection, getCollectionName } from '../types/models/firestoreCollections';

const collection: string = getCollectionName(FirestoreCollection.MOLD_FOLDERS);

export const addMoldFolder = async (data: MoldFolder) =>
  addDocument(collection, data);
export const findMoldFolderById = async (id: string) =>
  getDocumentById(collection, id);
export const findMoldFolderByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findAllMoldFolders = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<{ snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null } | null> => {
  try {
    // queryModifier applies your filters before ordering is applied in getPaginatedDocuments
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("user_id", "==", uid).where("is_archived", "==", isArchived);

    const paged = await getPaginatedDocuments(
      collection,
      limit,
      token,
      ["metadata.created_at", FieldPath.documentId()], // deterministic ordering by documentId
      { queryModifier }
    );

    return paged;
  } catch (err) {
    devLog(err);
    return null;
  }
};
export const updateMoldFolder = async (
  uid: string,
  updatedData: Partial<MoldFolder>
) => updateDocument(collection, uid, updatedData);
export const deleteMoldFolder = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMoldFolder = async (uid: string) =>
  softDeleteDocument(collection, uid);
