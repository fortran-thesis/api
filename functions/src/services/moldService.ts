import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMold,
  deleteMold,
  findAllMolds,
  findMoldById,
  findMoldByName,
  softDeleteMold,
  updateMold,
} from "../repositories/moldRepository";
import {Mold, PaginatedResult, WithId, WithMetadata} from "../types/types";
import {
  getCachedList,
  cacheList,
  getCachedItem,
  cacheItem,
  handlePostCache,
  handlePatchCache,
  handleDeleteCache,
} from "../utils/cacheManager";

const RESOURCE = "molds";
const TTL = 300; // 5 minutes

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
    const result = documentToJson<WithId<Mold>>(mold);
    // Invalidate all list caches using new cache manager
    await handlePostCache(RESOURCE);
    return result;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMolds = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<Mold[]> | null> => {
  const query = {limit, token};

  try {
    // Check cache using new cache manager
    const cached = await getCachedList<PaginatedResult<Mold[]>>(RESOURCE, query);
    if (cached) return cached;

    // Use the common getPaginatedDocuments helper (cursor-first)
    const paged = await findAllMolds(limit, token);
    if (!paged) {
      // return empty page (empty array + null token) could also be desirable instead of throwing
      throw new Error("Failed to fetch molds.");
    }

    const items: PaginatedResult<Mold[]> = {
      snapshot: queryToJson<Mold>(paged.snapshot),
      nextPageToken: paged.nextPageToken,
    };

    // Cache the entire page using new cache manager
    await cacheList(RESOURCE, items, query, {ttl: TTL});

    return items;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldById = async (id: string): Promise<Mold | null> => {
  try {
    // Check cache using new cache manager
    const cached = await getCachedItem<Mold>(RESOURCE, id);
    if (cached) return cached;

    const mold: DocumentSnapshot | null = await findMoldById(id);
    if (!mold) throw new Error("No mold found.");
    const molds = documentToJson<Mold>(mold);

    // Cache using new cache manager
    if (molds) await cacheItem(RESOURCE, id, molds, {ttl: TTL});
    return molds;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldByName = async (
  name: string
): Promise<Mold | null> => {
  try {
    // Check cache using custom key (name lookup)
    const cached = await getCachedItem<Mold>(RESOURCE, `name:${name}`);
    if (cached) return cached;

    const mold: QuerySnapshot | null = await findMoldByName(name);
    if (!mold) throw new Error("No user found.");
    const molds = queryToJson<Mold>(mold);
    const result = molds.length > 0 ? molds[0] : null;

    // Cache using custom key
    if (result) await cacheItem(RESOURCE, `name:${name}`, result, {ttl: TTL});
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

    // Invalidate cache using new cache manager (invalidates item + all lists)
    await handlePatchCache(RESOURCE, id);

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

    // Invalidate cache using new cache manager (invalidates item + all lists)
    await handleDeleteCache(RESOURCE, id);
  } catch (error) {
    devLog(error);
  }
};

export const removeMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMold(id);
    if (!result) throw new Error("Failed to delete mold");

    // Invalidate cache using new cache manager (invalidates item + all lists)
    await handleDeleteCache(RESOURCE, id);
  } catch (error) {
    devLog(error);
  }
};
