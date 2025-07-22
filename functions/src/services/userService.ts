import { QuerySnapshot } from "firebase-admin/firestore";
import { APIUser, User } from "../types/types";
import { queryToJson } from "../lib/firestore";
import {
  findAllUsers,
  findUserByEmail,
  findUserById,
} from "../repositories/userRepository";
import { devLog } from "../utils/dev";

export const retrieveAllUsers = async (limit: number, offset: number): Promise<User[] | null> => {
  try {
    const users: QuerySnapshot | null = await findAllUsers(limit, offset);
    if (!users) throw new Error("No users found.");
    return queryToJson<User>(users);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserById = async (id: string): Promise<APIUser | null> => {
  try {
    const user: APIUser | null = await findUserById(id);
    if (!user) throw new Error("No user found.");
    return user
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserByEmail = async (
  email: string
): Promise<APIUser | null> => {
  try {
    const user: APIUser | null = await findUserByEmail(email);
    if (!user) throw new Error("No user found.");
    return user;
  } catch (error) {
    devLog(error);
    return null;
  }
};
