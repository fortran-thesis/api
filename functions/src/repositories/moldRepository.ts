import {FieldPath} from "firebase-admin/firestore";
import {
  addDocument,
  deleteDocument,
  getDocumentsByField,
  getDocumentById,
  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import {Mold} from "../types/types";
import {OrderField} from "../utils/pagination";
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";

const collection: string = getCollectionName(FirestoreCollection.MOLDS);

export const addMold = async (data: Mold) => addDocument(collection, data);
export const findMoldById = async (id: string) =>
  getDocumentById(collection, id);
export const findMoldByName = async (name: string) =>
  getDocumentsByField(collection, "name", name);
export const findMoldByPredictedClassName = async (predictedClassName: string) =>
  getDocumentsByField(collection, "mold_details.info.predicted_class_name", predictedClassName);
export const findMoldByPredictedClassId = async (predictedClassId: number) =>
  getDocumentsByField(collection, "mold_details.info.predicted_class_id", predictedClassId);
export const findAllMolds = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "name", FieldPath.documentId()]
) =>
  getPaginatedDocuments(collection, limit, token, orderFields);
export const updateMold = async (uid: string, updatedData: Partial<Mold>) =>
  updateDocument(collection, uid, updatedData);
export const deleteMold = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteMold = async (uid: string) =>
  softDeleteDocument(collection, uid);
