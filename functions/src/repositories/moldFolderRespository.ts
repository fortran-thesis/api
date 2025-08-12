import { FieldPath } from "firebase-admin/firestore";
import {
  addDocument,
  getDocumentsByField,
  updateDocument,
  deleteDocument,
  softDeleteDocument,
  getFirestore,
} from "../lib/firestore";
import { MoldFolder } from "../types/types";
import { devLog } from "../utils/dev";

const collection: string = "mold_folders";

export const addMoldFolder = async (data: MoldFolder) =>
  addDocument(collection, data);
export const findMoldFolderById = async (id: string) =>
  getDocumentsByField(collection, "id", id);
export const findMoldFolderByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findAllMoldFolders = async (
  uid: string,
  limit: number,
  offset: number,
  isArchived: boolean
) => {
  try {
    let query = await getFirestore()
      .collection(collection)
      .where("user_id", "==", uid)
      .where("is_archived", "==", isArchived)
      .orderBy(FieldPath.documentId());
    if (offset && offset > 0) {
      query = query.offset(offset);
    }
    if (limit && limit > 0) {
      query = query.limit(limit);
    }
    const querySnap = await query.get();
    if (querySnap.empty) throw new Error("No documents found");
    return querySnap;
  } catch (error) {
    devLog(error);
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
