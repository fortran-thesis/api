import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addMold,
  deleteMold,
  findAllMolds,
  findMoldById,
  findMoldByName,
  softDeleteMold,
  updateMold,
} from "../repositories/moldRepository";
import { Mold, PaginatedResult, WithId, WithMetadata } from "../types/types";
import { getCache, setCache, deleteCache, deleteCachePattern } from '../utils/redis';

export const addMoldToFirestore = async (
  details: Mold
): Promise<WithId<Mold> | null> => {
  try {
    const detailsWithMetadata: WithMetadata<Mold> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const mold: DocumentSnapshot | null = await addMold(detailsWithMetadata);
    if (!mold) throw new Error("Cannot add mold.");
    // Invalidate all list caches
    await deleteCachePattern('molds:list:*');
    return documentToJson<WithId<Mold>>(mold);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMolds = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<Mold[]> | null> => {
  // Build a short, safe cache key based on limit + token hash (or 'start' for the first page)
  const tokenKey = token
  const cacheKey = `molds:list:${limit}:${tokenKey}`;

  try {
    const cached = await getCache<PaginatedResult<Mold[]>>(cacheKey);
    if (cached) return cached;

    // Use the common getPaginatedDocuments helper (cursor-first)
    const paged = await findAllMolds(limit, token);
    if (!paged) {
      // return empty page (empty array + null token) could also be desirable instead of throwing
      throw new Error("Failed to fetch molds.");
    }

    const items: PaginatedResult<Mold[]> = {snapshot: queryToJson<Mold>(paged.snapshot), nextPageToken: paged.nextPageToken};

    // Cache the entire page (items + nextPageToken) for a short TTL (5 minutes)
    await setCache(cacheKey, items, 300);

    return items;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldById = async (id: string): Promise<Mold | null> => {
  const cacheKey = `mold:${id}`;
  try {
    const cached = await getCache<Mold>(cacheKey);
    if (cached) return cached;
    const mold: DocumentSnapshot | null = await findMoldById(id);
    if (!mold) throw new Error("No mold found.");
    const molds = documentToJson<Mold>(mold);
    if (molds) await setCache(cacheKey, molds, 300); // cache for 5 minutes
    return molds;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldByName = async (
  name: string
): Promise<Mold | null> => {
  const cacheKey = `mold:name:${name}`;
  try {
    const cached = await getCache<Mold>(cacheKey);
    if (cached) return cached;
    const mold: QuerySnapshot | null = await findMoldByName(name);
    if (!mold) throw new Error("No user found.");
    const molds = queryToJson<Mold>(mold);
    const result = molds.length > 0 ? molds[0] : null;
    if (result) await setCache(cacheKey, result, 300); // cache for 5 minutes
    return result;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldInFirestore = async (
  id: string,
  details: Partial<Mold>
): Promise<Mold | null> => {
  try {
    const result: WriteResult | null = await updateMold(id, details);
    if (!result) throw new Error("Failed to update mold.");
    // Invalidate cache for this mold and all lists
    await deleteCache(`mold:${id}`);
    await deleteCachePattern('molds:list:*');
    const updatedMold = await retrieveMoldById(id);
    return updatedMold;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMold(id);
    if (!result) throw new Error("Failed to delete mold");
    // Invalidate cache for this mold and all lists
    await deleteCache(`mold:${id}`);
    await deleteCachePattern('molds:list:*');
  } catch (error) {
    devLog(error);
  }
};

export const removeMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMold(id);
    if (!result) throw new Error("Failed to delete mold");
    // Invalidate cache for this mold and all lists
    await deleteCache(`mold:${id}`);
    await deleteCachePattern('molds:list:*');
  } catch (error) {
    devLog(error);
  }
};
