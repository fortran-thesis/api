import { FieldPath } from "firebase-admin/firestore";
import { getAuthUserByEmail, getAuthUserById } from "../lib/auth";
import {
  addDocument,
  deleteDocument,
  getDocumentById,
  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import { IsCurator, User } from "../types/types";
import { OrderField } from "../utils/pagination";
import { FirestoreCollection, getCollectionName } from '../types/models/firestoreCollections';

const collection: string = getCollectionName(FirestoreCollection.USERS);

export const addUser = async (data: User, uid: string) =>
  addDocument(collection, data, uid);
export const findFirestoreUserById = async (id: string) =>
  getDocumentById(collection, id);
export const findAuthUserById = async (id: string) => getAuthUserById(id);
export const findAuthUserByEmail = async (email: string) =>
  getAuthUserByEmail(email);
export const findAllUsers = async (
  limit: number,
  token?: string,
  orderFields: OrderField[] = ["metadata.created_at", "username", FieldPath.documentId()]
) => getPaginatedDocuments(collection, limit, token, orderFields);
export const updateFirestoreUser = async (
  uid: string,
  updatedData: Partial<User> | Partial<IsCurator<User>>
) => updateDocument(collection, uid, updatedData);
export const deleteFirestoreUser = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteFirestoreUser = async (uid: string) =>
  softDeleteDocument(collection, uid);
