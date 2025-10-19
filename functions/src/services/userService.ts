import { APIUser, User, WithId, PaginatedResult } from "../types/types";
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
  token?: string
): Promise<PaginatedResult<APIUser[]> | null> => {
  try {
    // Use cursor-based pagination
    const result = await findAllUsers(limit, token, ["metadata.created_at", "username"]);
    if (!result || !result.snapshot) throw new Error("No users found.");
    const firestoreList: WithId<User>[] = queryToJson<User>(result.snapshot);
    const identifiers = firestoreList.map((user) => ({ uid: user.id }));
    const authUsers = await getAuth().getUsers(identifiers);

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsers.users.find((u) => u.uid === firestoreUser.id);
      return {
        id: firestoreUser.id,
        user: {
          username: firestoreUser.username,
          first_name: firestoreUser.first_name,
          last_name: firestoreUser.last_name,
          address: firestoreUser.address,
          role: firestoreUser.role,
          is_banned: firestoreUser.is_banned,
        },
        details: {
          email: authUser?.email ?? "",
          displayName: authUser?.displayName ?? "",
          photo_url: authUser?.photoURL ?? "",
          disabled: !!authUser?.disabled,
          phone_number: authUser?.phoneNumber
        },
      };
    });

    return { snapshot: userList, nextPageToken: result.nextPageToken };
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
