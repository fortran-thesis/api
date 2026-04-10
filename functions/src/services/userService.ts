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
import {normalizeRole} from "../utils/roleNormalizer";
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
    const authUsersMap = new Map(authUsers.users.map((user) => [user.uid, user]));

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsersMap.get(firestoreUser.id);
      return {
        id: firestoreUser.id,
        user: {
          username: firestoreUser.username,
          first_name: firestoreUser.first_name,
          last_name: firestoreUser.last_name,
          address: firestoreUser.address,
          role: normalizeRole(firestoreUser.role),
          is_banned: firestoreUser.is_banned,
          occupation: firestoreUser.occupation,
        },
        details: {
          email: authUser?.email ?? "",
          displayName: authUser?.displayName ?? "",
          photo_url: authUser?.photoURL ?? "",
          disabled: !!authUser?.disabled,
          phone_number: authUser?.phoneNumber,
          address: firestoreUser.address,
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
    const authUsersMap = new Map(authUsers.users.map((user) => [user.uid, user]));

    const userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsersMap.get(firestoreUser.id);
      return {
        id: firestoreUser.id,
        user: {
          username: firestoreUser.username,
          first_name: firestoreUser.first_name,
          last_name: firestoreUser.last_name,
          address: firestoreUser.address,
          role: normalizeRole(firestoreUser.role),
          is_banned: firestoreUser.is_banned,
          occupation: firestoreUser.occupation,
        },
        details: {
          email: authUser?.email ?? "",
          displayName: authUser?.displayName ?? "",
          photo_url: authUser?.photoURL ?? "",
          disabled: !!authUser?.disabled,
          phone_number: authUser?.phoneNumber,
          address: firestoreUser.address,
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
    const cached = await getCachedItem<Record<string, number>>(
      RESOURCE,
      "role-counts"
    );
    if (cached) return cached;

    const mapping: Record<string, string[]> = {
      [Role.USER]: [Role.USER, "user"],
      [Role.CURATOR]: [Role.CURATOR, "curator"],
      [Role.ADMIN]: [Role.ADMIN, "administrator"],
    };

    // Parallelize all role count queries
    const keys = Object.keys(mapping);
    const counts = await Promise.all(
      keys.map((key) => countUsersByRoles(mapping[key]))
    );

    const result: Record<string, number> = {};
    keys.forEach((key, idx) => {
      const count = counts[idx];
      result[key] = typeof count === "number" ? count : 0;
    });

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

/**
 * Search and filter users by multiple criteria.
 * Supports searching by name/email and filtering by role and active status.
 *
 * @param searchQuery - Optional search term to filter by username, email, first_name, or last_name
 * @param role - Optional role filter (e.g., 'farmer', 'mycologist')
 * @param active - Optional active status filter (true = active, false = disabled)
 * @param limit - Number of results per page
 * @param token - Pagination token
 * @returns Paginated and filtered user results
 */
export const searchAndFilterUsers = async (
  searchQuery: string | undefined,
  role: string | undefined,
  active: boolean | undefined,
  limit: number,
  token?: string
): Promise<PaginatedResult<APIUser[]> | null> => {
  try {
    // Build cache query params - only cache first page (no token)
    const cacheQuery = {
      search: searchQuery || "",
      role: role || "",
      active: active !== undefined ? active.toString() : "",
      limit,
      token: token || "first",
    };
    const shouldCache = false; // Only cache first page

    // Check cache first (only for first page)
    if (shouldCache) {
      const cached = await getCachedList<PaginatedResult<APIUser[]>>(
        `${RESOURCE}-search`, // Different cache namespace to avoid conflicts
        cacheQuery
      );
      if (cached) return cached;
    }

    // Fetch from repository WITHOUT using the cached retrieveUsersByRole/retrieveAllUsers
    // to avoid cache pollution
    let result: {snapshot: FirebaseFirestore.QuerySnapshot; nextPageToken: string | null} | null;

    if (role) {
      result = await findUsersByRole(role, limit * 3, token); // Get extra for filtering
    } else {
      result = await findAllUsers(limit * 3, token);
    }

    if (!result || !result.snapshot) return null;

    // Convert Firestore results to APIUser format
    const firestoreList: WithId<User>[] = queryToJson<User>(result.snapshot);
    const identifiers = firestoreList.map((user) => ({uid: user.id}));
    const authUsers = await getAuth().getUsers(identifiers);
    const authUsersMap = new Map(authUsers.users.map((user) => [user.uid, user]));

    let userList: APIUser[] = firestoreList.map((firestoreUser) => {
      const authUser = authUsersMap.get(firestoreUser.id);
      return {
        id: firestoreUser.id,
        user: {
          username: firestoreUser.username,
          first_name: firestoreUser.first_name,
          last_name: firestoreUser.last_name,
          address: firestoreUser.address,
          role: normalizeRole(firestoreUser.role),
          is_banned: firestoreUser.is_banned,
          occupation: firestoreUser.occupation,
        },
        details: {
          email: authUser?.email ?? "",
          displayName: authUser?.displayName ?? "",
          photo_url: authUser?.photoURL ?? "",
          disabled: !!authUser?.disabled,
          phone_number: authUser?.phoneNumber,
          address: firestoreUser.address,
        },
      };
    });

    // Apply active/disabled filter if specified
    if (active !== undefined) {
      userList = userList.filter((u) => {
        const disabled = !!u.details?.disabled;
        return active ? !disabled : disabled;
      });
    }

    // Apply search filter if query provided
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      userList = userList.filter((u) => {
        const username = u.user?.username?.toLowerCase() || "";
        const email = u.details?.email?.toLowerCase() || "";
        const firstName = u.user?.first_name?.toLowerCase() || "";
        const lastName = u.user?.last_name?.toLowerCase() || "";
        const fullName = `${firstName} ${lastName}`.trim();

        return (
          username.includes(query) ||
          email.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query)
        );
      });
    }

    // Trim results to requested limit
    const trimmedResults = userList.slice(0, limit);

    const paginatedResult = {
      snapshot: trimmedResults,
      nextPageToken: userList.length > limit ? result.nextPageToken : null,
    };

    // Cache the result (only first page) in separate namespace
    if (shouldCache) {
      await cacheList(`${RESOURCE}-search`, paginatedResult, cacheQuery, {ttl: TTL});
    }

    return paginatedResult;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Fetch all admin user IDs for notification purposes.
 * @returns Array of admin user IDs
 */
export const getAdminUserIds = async (): Promise<string[]> => {
  try {
    const result = await findUsersByRole(Role.ADMIN, 500); // 500 is a safe ceiling for admin count
    if (!result || !result.snapshot) return [];
    const firestoreList: WithId<User>[] = queryToJson<User>(result.snapshot);
    return firestoreList.map((user) => user.id);
  } catch (error) {
    devLog(error);
    return [];
  }
};
