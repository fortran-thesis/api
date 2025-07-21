import {
  addDocument,
  deleteDocument,
  getAllDocuments,
  getDocumentByField,
  getDocumentById,
  updateDocument,
} from "../lib/firestore";
import { User } from "../types/types";

const collection: string = "users";

export const addUser = async (data: User) => addDocument(collection, data);
export const findUserById = async (uid: string) =>
  getDocumentById(collection, uid);
export const findUserByEmail = async (email: string) =>
  getDocumentByField(collection, "email", email);
export const findAllUsers = async () => getAllDocuments(collection);
export const updateUser = async (uid: string, updatedData: Partial<User>) =>
  updateDocument(collection, uid, updatedData);
export const deleteUser = async (uid: string) =>
  deleteDocument(collection, uid);
