import { DocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
import { User } from "../types/types";
import { documentToJson, queryToJson } from "../lib/firestore";
import {
  findAllUsers,
  findUserByEmail,
  findUserById,
} from "../repositories/userRepository";
import { devLog } from "../utils/dev";

export const retrieveAllUsers = async (): Promise<User[] | null> => {
  try {
    const users: QuerySnapshot | null = await findAllUsers();
    if (!users) throw new Error("No users found.");
    return queryToJson<User>(users);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserById = async (id: string): Promise<User | null> => {
  try {
    const user: DocumentSnapshot | null = await findUserById(id);
    if (!user) throw new Error("No user found.");
    return documentToJson<User>(user);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserByEmail = async (
  email: string
): Promise<User | null> => {
  try {
    const user: QuerySnapshot | null = await findUserByEmail(email);
    if (!user) throw new Error("No user found.");
    return queryToJson<User>(user)[0];
  } catch (error) {
    devLog(error);
    return null;
  }
};
