import { QuerySnapshot } from "firebase-admin/firestore";
import { APIUser, User, WithId } from "../types/types";
import {
  findAllUsers,
  findAuthUserByEmail,
  findAuthUserById,
} from "../repositories/userRepository";
import { devLog } from "../utils/dev";
import { getAuth } from "firebase-admin/auth";
import { queryToJson } from "../lib/firestore";

export const retrieveAllUsers = async (
  limit: number,
  offset: number
): Promise<APIUser[] | null> => {
  try {
    const users: QuerySnapshot | null = await findAllUsers(limit, offset);
    if (!users) throw new Error("No users found.");
    const firestoreList: WithId<User>[] = queryToJson<User>(users);
    const identifiers = firestoreList.map((user) => ({ uid: user.id }));
    const authUsers = await getAuth().getUsers(identifiers);

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsers.users.find((u) => u.uid === firestoreUser.id);
      return {
        id: firestoreUser.id,
        user: {
          username: firestoreUser.username,
          role: firestoreUser.role,
          is_banned: firestoreUser.is_banned,
        },
        details: {
          email: authUser?.email,
          displayName: authUser?.displayName,
          disabled: !!authUser?.disabled,
        },
      };
    });

    return userList;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserById = async (id: string): Promise<APIUser | null> => {
  try {
    const user: APIUser | null = await findAuthUserById(id);
    if (!user) throw new Error("No user found.");
    return user;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserByEmail = async (
  email: string
): Promise<APIUser | null> => {
  try {
    const user: APIUser | null = await findAuthUserByEmail(email);
    if (!user) throw new Error("No user found.");
    return user;
  } catch (error) {
    devLog(error);
    return null;
  }
};
