import { getAuthUserByEmail, getAuthUserById } from "../lib/auth";
import {
  addDocument,
  deleteDocument,

  getDocumentById,

  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import { User } from "../types/types";

const collection: string = "users";

export const addUser = async (data: User, uid: string) => addDocument(collection, data, uid);
export const findFirestoreUserById = async (id: string) => getDocumentById(collection, id);
export const findAuthUserById = async (id: string) => getAuthUserById(id);
export const findAuthUserByEmail = async (email: string) => getAuthUserByEmail(email);
export const findAllUsers = async (limit: number, offset: number) => getPaginatedDocuments(collection, limit, offset);
export const updateFirestoreUser = async (uid: string, updatedData: Partial<User>) =>
  updateDocument(collection, uid, updatedData);
export const deleteFirestoreUser = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteFirestoreUser = async (uid: string) => 
  softDeleteDocument(collection, uid)

