import {APIUser, User, WithId, PaginatedResult} from "../types/types";
import {
  findAllUsers,
  findUsersByRole,
  findAuthUserByEmail,
  findAuthUserById,
  countUsersByRoles,
  countUsersByDisabled,
} from "../repositories/userRepository";
import {devLog} from "../utils/dev";
import {getAuth} from "firebase-admin/auth";
import {queryToJson} from "../lib/firestore";
import {Role} from "../types/enums";
import {
  getCachedList,
  cacheList,
  getCachedItem,
  cacheItem,
} from "../utils/cacheManager";

const RESOURCE = "users";
const TTL = 300; // 5 minutes

export const retrieveAllUsers = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<APIUser[]> | null> => {
  try {
    // Only cache the first page (no token), not subsequent pages
    // Tokens are ephemeral navigation state
    const query = {limit, token: token || "first"};
    const shouldCache = !token; // Only cache first page

    if (shouldCache) {
      const cached = await getCachedList<PaginatedResult<APIUser[]>>(
        RESOURCE,
        query
      );
      if (cached) return cached;
    }

    const result = await findAllUsers(limit, token);
    if (!result || !result.snapshot) throw new Error("No users found.");
    const firestoreList: WithId<User>[] = queryToJson<User>(result.snapshot);
    const identifiers = firestoreList.map((user) => ({uid: user.id}));
    const authUsers = await getAuth().getUsers(identifiers);

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsers.users.find(
        (u: any) => u.uid === firestoreUser.id
      );
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
          phone_number: authUser?.phoneNumber,
        },
      };
    });

    const paginatedResult = {
      snapshot: userList,
      nextPageToken: result.nextPageToken,
    };

    // Cache only the first page
    if (shouldCache) {
      await cacheList(RESOURCE, paginatedResult, query, {ttl: TTL});
    }

    return paginatedResult;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUsersByRole = async (
  role: string,
  limit: number,
  token?: string
): Promise<PaginatedResult<APIUser[]> | null> => {
  try {
    // Only cache the first page (no token), not subsequent pages
    // Tokens are ephemeral navigation state
    const query = {role, limit, token: token || "first"};
    const shouldCache = !token; // Only cache first page

    if (shouldCache) {
      const cached = await getCachedList<PaginatedResult<APIUser[]>>(
        RESOURCE,
        query
      );
      if (cached) return cached;
    }

    const result = await findUsersByRole(role, limit, token);
    if (!result || !result.snapshot) throw new Error("No users found.");
    const firestoreList: any[] = queryToJson<any>(result.snapshot);
    const identifiers = firestoreList.map((user) => ({uid: user.id}));
    const authUsers = await getAuth().getUsers(identifiers);

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsers.users.find(
        (u: any) => u.uid === firestoreUser.id
      );
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
          phone_number: authUser?.phoneNumber,
        },
      };
    });

    const paginatedResult = {
      snapshot: userList,
      nextPageToken: result.nextPageToken,
    };

    // Cache only the first page
    if (shouldCache) {
      await cacheList(RESOURCE, paginatedResult, query, {ttl: TTL});
    }

    return paginatedResult;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUserById = async (id: string): Promise<APIUser | null> => {
  try {
    // Check cache first
    const cached = await getCachedItem<APIUser>(RESOURCE, id);
    if (cached) return cached;

    // Cache miss - fetch from database
    const user: APIUser | null = await findAuthUserById(id);
    if (!user) throw new Error("No user found.");

    // Cache the result
    await cacheItem(RESOURCE, id, user, {ttl: TTL});

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

export const getRoleCounts = async (): Promise<Record<
  string,
  number
> | null> => {
  try {
    // Check cache first
    const cached = await getCachedItem<Record<string, number>>(
      RESOURCE,
      "role-counts"
    );
    if (cached) return cached;

    // Cache miss - fetch from database
    // Map current role values to include legacy role names
    const mapping: Record<string, string[]> = {
      [Role.USER]: [Role.USER, "user"],
      [Role.CURATOR]: [Role.CURATOR, "curator"],
      [Role.ADMIN]: [Role.ADMIN, "administrator"],
    };

    const result: Record<string, number> = {};
    for (const key of Object.keys(mapping)) {
      const roles = mapping[key];
      const count = await countUsersByRoles(roles);
      result[key] = typeof count === "number" ? count : 0;
    }

    // Cache the result
    await cacheItem(RESOURCE, "role-counts", result, {ttl: TTL});

    return result;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Return users filtered by active/disabled flag.
 * Note: this uses the existing paginated retrieval and filters the page results by
 * the Firebase Auth `disabled` flag. It returns the filtered page and the same
 * nextPageToken (server-side pagination still based on Firestore ordering).
 */
export const getUsersByActiveStatus = async (
  limit: number,
  pageToken: string | undefined,
  active = true
): Promise<PaginatedResult<APIUser[]> | null> => {
  try {
    const result = await retrieveAllUsers(limit, pageToken);
    if (!result || !result.snapshot) return null;
    const filtered = result.snapshot.filter((u) => {
      // details.disabled is boolean; active means disabled=false
      const disabled = !!u.details?.disabled;
      return active ? !disabled : disabled;
    });
    return {snapshot: filtered, nextPageToken: result.nextPageToken};
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Count users by disabled flag across all Firebase Auth users.
 * Iterates through auth.listUsers pages and counts disabled vs active users.
 */
export const getDisabledCounts = async (): Promise<{
  active: number;
  inactive: number;
} | null> => {
  try {
    // Check cache first
    const cached = await getCachedItem<{ active: number; inactive: number }>(
      RESOURCE,
      "disabled-counts"
    );
    if (cached) return cached;

    // Cache miss - fetch from database
    const counts = await countUsersByDisabled();

    if (counts) {
      // Cache the result
      await cacheItem(RESOURCE, "disabled-counts", counts, {ttl: TTL});
    }

    return counts;
  } catch (error) {
    devLog(error);
    return null;
  }
};
