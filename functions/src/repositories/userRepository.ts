import { getAuthUserByEmail, getAuthUserById } from "../lib/auth";
import {
  addDocument,
  deleteDocument,

  getPaginatedDocuments,
  softDeleteDocument,
  updateDocument,
} from "../lib/firestore";
import { User } from "../types/types";

const collection: string = "users";

export const addUser = async (data: User, uid: string) => addDocument(collection, data, uid);
export const findUserById = async (id: string) => getAuthUserById(id);
export const findUserByEmail = async (email: string) => getAuthUserByEmail(email);
export const findAllUsers = async (limit: number, offset: number) => getPaginatedDocuments(collection, limit, offset);
export const updateFirestoreUser = async (uid: string, updatedData: Partial<User>) =>
  updateDocument(collection, uid, updatedData);
export const deleteFirestoreUser = async (uid: string) =>
  deleteDocument(collection, uid);
export const softDeleteFirestoreUser = async (uid: string) => 
  softDeleteDocument(collection, uid)

