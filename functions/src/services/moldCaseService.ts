import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson, getDb} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMoldCase,
  deleteMoldCase,
  findAllMoldCases,
  findAssignedMoldCases,
  findAssignedMoldCasesWithSearch,
  findMoldCaseById,
  findMoldCaseByName,
  findMoldCaseByReportId,
  findMoldCasesByMoldipediaId,
  softDeleteMoldCase,
  updateMoldCase as updateMoldCaseRepo,
  updateCultivationDetails,
  countCasesByPriority,
  countAllMoldCasesWithMetadata,
} from "../repositories/moldCaseRepository";
import {
  addCultivationLog as addCultivationLogRepo,
  findCultivationLogsByCaseId,
  deleteCultivationLog as deleteCultivationLogRepo,
} from "../repositories/cultivationLogRepository";
import {CultivationLog, MoldCase, MoldCaseResponse, PaginatedResult, WithMetadata, WithMetadataAndId} from "../types/types";
import {transformToSignedUrl} from "../utils/storageTransform";
import {
  cacheItem,
  getCachedItem,
  cacheList,
  getCachedList,
  getCachedListDescriptors,
  generateListMetadataCacheKey,
  invalidateItem,
  invalidateAllLists,
  removeCachedListItem,
  replaceCachedListItem,
  upsertCachedListItem,
} from "../utils/cacheManager";
import {normalizeResponseTimestamps} from "../utils/normalizeResponse";
import {deleteCache} from "../utils/redis";
// Cache TTL for this service (in seconds) — keep signed URLs consistent with cached responses
const MOLD_CASE_SERVICE_TTL_SECONDS = 300;
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";
import {getRoleCounts, getDisabledCounts} from "./userService";
import {getMoldReportStatusCounts} from "./moldReportService";
import {getAuthUserById, getAuthUserNamesByIds} from "../lib/auth";
import {findMoldById} from "../repositories/moldRepository";
import {CultivationDetailsUpdate} from "../repositories/moldCaseRepository";

// Helper function to transform MoldCase photo_url to signed URL
const transformMoldCaseImages = async (moldCase: MoldCaseResponse): Promise<MoldCaseResponse> => {
  const transformed = {...moldCase};

  // Ensure photo_url is a string before attempting to transform
  if (transformed.photo_url) {
    if (typeof transformed.photo_url !== "string") {
      devLog(`transformMoldCaseImages: photo_url is not a string, setting to null. type=${typeof transformed.photo_url}`);
      transformed.photo_url = null;
    } else {
      transformed.photo_url = await transformToSignedUrl(transformed.photo_url, MOLD_CASE_SERVICE_TTL_SECONDS);
    }
  }

  const details = (transformed as any).cultivation_details;
  if (details && typeof details === "object") {
    const signIfString = async (value: unknown): Promise<string | unknown> => {
      if (typeof value !== "string" || value.trim().length === 0) return value;
      return (await transformToSignedUrl(value, MOLD_CASE_SERVICE_TTL_SECONDS)) || value;
    };

    const initialObservations = details.initial_observations;
    if (initialObservations && typeof initialObservations === "object") {
      const [microscopicUrl, macroscopicUrl] = await Promise.all([
        signIfString(initialObservations.microscopic_image_path),
        signIfString(initialObservations.macroscopic_image_path),
      ]);

      initialObservations.microscopic_image_url = microscopicUrl;
      initialObservations.macroscopic_image_url = macroscopicUrl;
    }
  }

  return transformed;
};

// Helper: transform a single cultivation log's image_url to a signed URL
const transformLogImageUrl = async (log: WithMetadataAndId<CultivationLog>): Promise<WithMetadataAndId<CultivationLog>> => {
  if (log.image_url) {
    log.image_url = await transformToSignedUrl(log.image_url, MOLD_CASE_SERVICE_TTL_SECONDS) || log.image_url;
  }
  return log;
};

const normalizeCaseResponse = <T>(value: T): T => normalizeResponseTimestamps(value);

const resolveAuthUserDisplayName = (authUser: any): string => {
  if (!authUser) return "";

  return authUser.details?.displayName ||
    `${authUser.user?.first_name || ""} ${authUser.user?.last_name || ""}`.trim();
};

const rehydrateCaseNames = async (moldCase: MoldCaseResponse): Promise<MoldCaseResponse> => {
  if (moldCase?.user_id && !moldCase.user_name) {
    try {
      const authUser = await getAuthUserById(moldCase.user_id);
      if (authUser) {
        moldCase.user_name = resolveAuthUserDisplayName(authUser);
      }
    } catch (e) {
      devLog(e, "REHYDRATE_USER_NAME");
    }
  }

  if (moldCase?.mycologist_id && !moldCase.mycologist_name) {
    try {
      const authUser = await getAuthUserById(moldCase.mycologist_id);
      if (authUser) {
        moldCase.mycologist_name = resolveAuthUserDisplayName(authUser);
      }
    } catch (e) {
      devLog(e, "REHYDRATE_MYCOLOGIST_NAME");
    }
  }

  const verdict = moldCase?.final_verdict;
  if (verdict) {
    if (verdict.moldId) {
      try {
        const snap = await findMoldById(verdict.moldId);
        const data = snap?.exists ? (snap.data() as any) : null;
        if (data?.name) {
          verdict.moldName = data.name;
        }
      } catch (e) {
        devLog(e, "REHYDRATE_MOLD_NAME");
      }
    }

    if (!verdict.moldName && verdict.verdict_fallback_name) {
      verdict.moldName = verdict.verdict_fallback_name;
    }
  }

  return moldCase;
};

const rehydrateCaseNamesBatch = async (moldCases: MoldCaseResponse[]): Promise<MoldCaseResponse[]> => {
  if (!Array.isArray(moldCases) || moldCases.length === 0) {
    return moldCases;
  }

  const userIds = new Set<string>();
  const moldIds = new Set<string>();

  for (const moldCase of moldCases) {
    if (typeof moldCase.user_id === "string" && moldCase.user_id.trim()) {
      userIds.add(moldCase.user_id.trim());
    }
    if (typeof moldCase.mycologist_id === "string" && moldCase.mycologist_id.trim()) {
      userIds.add(moldCase.mycologist_id.trim());
    }

    const moldId = moldCase.final_verdict?.moldId;
    if (typeof moldId === "string" && moldId.trim()) {
      moldIds.add(moldId.trim());
    }
  }

  const authNameMap = userIds.size > 0 ? await getAuthUserNamesByIds(Array.from(userIds)) : new Map<string, string>();
  const moldNameMap = new Map<string, string>();

  await Promise.all(Array.from(moldIds).map(async (moldId) => {
    try {
      const snap = await findMoldById(moldId);
      const data = snap?.exists ? (snap.data() as any) : null;
      if (data?.name) {
        moldNameMap.set(moldId, String(data.name));
      }
    } catch (e) {
      devLog(e, "REHYDRATE_MOLD_NAME_BATCH");
    }
  }));

  return moldCases.map((moldCase) => {
    const hydrated = {...moldCase};

    if (hydrated.user_id && !hydrated.user_name) {
      const userName = authNameMap.get(hydrated.user_id);
      if (userName) {
        hydrated.user_name = userName;
      }
    }

    if (hydrated.mycologist_id && !hydrated.mycologist_name) {
      const mycologistName = authNameMap.get(hydrated.mycologist_id);
      if (mycologistName) {
        hydrated.mycologist_name = mycologistName;
      }
    }

    const verdict = hydrated.final_verdict;
    if (verdict) {
      if (verdict.moldId) {
        const moldName = moldNameMap.get(verdict.moldId);
        if (moldName) {
          verdict.moldName = moldName;
        }
      }

      if (!verdict.moldName && verdict.verdict_fallback_name) {
        verdict.moldName = verdict.verdict_fallback_name;
      }
    }

    return hydrated;
  });
};

const CASE_LIST_RESOURCES = ["v2:mold-cases-all", "v2:mold-cases-assigned"] as const;

const isCursorQuery = (query?: Record<string, any> | null): boolean => {
  if (!query) return false;

  const cursor = query.token ?? query.pageToken;
  if (typeof cursor === "string") {
    return cursor.trim().length > 0;
  }

  return cursor !== undefined && cursor !== null;
};

const isFirstPageQuery = (query?: Record<string, any> | null): boolean => !isCursorQuery(query);

const deleteListDescriptorCache = async (key: string): Promise<void> => {
  await Promise.all([
    deleteCache(key),
    deleteCache(generateListMetadataCacheKey(key)),
  ]);
};

const invalidateCaseCursorPages = async (resource: string): Promise<void> => {
  const descriptors = await getCachedListDescriptors(resource);
  await Promise.all(
    descriptors
      .filter((descriptor) => isCursorQuery(descriptor.metadata.query))
      .map((descriptor) => deleteListDescriptorCache(descriptor.key))
  );
};

const invalidateMoldCaseListCaches = async (): Promise<void> => {
  await Promise.all(CASE_LIST_RESOURCES.map((resource) => invalidateAllLists(resource)));
};

const invalidateMoldCaseSummaryCaches = async (): Promise<void> => {
  await Promise.all([
    invalidateItem("dashboard", "combined-total-counts"),
    invalidateItem("dashboard", "mold-cases-count-metadata"),
    invalidateItem("mold-cases", "priority-breakdown"),
  ]);
};

const caseMatchesAllList = (
  moldCase: Pick<MoldCase, "user_id" | "is_archived">,
  query?: Record<string, any> | null
): boolean => {
  const uid = typeof query?.uid === "string" ? query.uid.trim() : "";
  if (!uid || moldCase.user_id !== uid) return false;

  const isArchived = Boolean(query?.isArchived);
  return Boolean(moldCase.is_archived) === isArchived;
};

const caseMatchesAssignedList = (
  moldCase: Pick<MoldCase, "mycologist_id" | "is_archived">,
  query?: Record<string, any> | null
): boolean => {
  const mycologistId = typeof query?.mycologistId === "string" ? query.mycologistId.trim() : "";
  if (!mycologistId || moldCase.mycologist_id !== mycologistId) return false;

  return moldCase.is_archived === false;
};

const caseMatchesDescriptor = (
  moldCase: MoldCase,
  descriptor: {key: string; metadata: {resource: string; query: Record<string, any> | null}}
): boolean => {
  switch (descriptor.metadata.resource) {
  case "v2:mold-cases-all":
    return caseMatchesAllList(moldCase, descriptor.metadata.query);
  case "v2:mold-cases-assigned":
    return caseMatchesAssignedList(moldCase, descriptor.metadata.query);
  default:
    return false;
  }
};

const createCaseCache = async (moldCase: MoldCase): Promise<void> => {
  await Promise.all(
    CASE_LIST_RESOURCES.map((resource) =>
      upsertCachedListItem(resource, moldCase, {
        shouldMutate: (descriptor) => isFirstPageQuery(descriptor.metadata.query) && caseMatchesDescriptor(moldCase, descriptor),
      })
    )
  );

  await Promise.all(CASE_LIST_RESOURCES.map((resource) => invalidateCaseCursorPages(resource)));
};

const replaceCaseCaches = async (moldCaseId: string, moldCase: MoldCase): Promise<void> => {
  await Promise.all(
    CASE_LIST_RESOURCES.map((resource) =>
      replaceCachedListItem(resource, moldCaseId, moldCase, {
        shouldMutate: (descriptor) => caseMatchesDescriptor(moldCase, descriptor),
      })
    )
  );
};

const removeCaseCaches = async (moldCaseId: string, moldCase: MoldCase): Promise<void> => {
  await Promise.all(
    CASE_LIST_RESOURCES.map((resource) =>
      removeCachedListItem(resource, moldCaseId, {
        shouldMutate: (descriptor) => isFirstPageQuery(descriptor.metadata.query) && caseMatchesDescriptor(moldCase, descriptor),
      })
    )
  );

  await Promise.all(CASE_LIST_RESOURCES.map((resource) => invalidateCaseCursorPages(resource)));
};

const caseUpdateAffectsMembership = (details: Partial<MoldCase>): boolean => {
  return Object.prototype.hasOwnProperty.call(details, "user_id") ||
    Object.prototype.hasOwnProperty.call(details, "mycologist_id") ||
    Object.prototype.hasOwnProperty.call(details, "is_archived");
};

export const addMoldCaseToFirestore = async (
  details: MoldCase
): Promise<MoldCaseResponse | null> => {
  try {
    const {
      user_name: _userName,
      mycologist_name: _mycologistName,
      ...persistableDetails
    } = details as MoldCaseResponse & Record<string, unknown>;

    // convert start_date/end_date (strings from DTO) to Firestore Timestamp
    const rawStart = (persistableDetails as any).start_date;
    const rawEnd = (persistableDetails as any).end_date;
    const parsedStart =
      typeof rawStart === "string" ? new Date(rawStart) : rawStart;
    const parsedEnd = typeof rawEnd === "string" ? new Date(rawEnd) : rawEnd;
    const startTimestamp =
      parsedStart instanceof Date && !isNaN(parsedStart.getTime()) ?
        Timestamp.fromDate(parsedStart) :
        parsedStart;
    const endTimestamp =
      parsedEnd instanceof Date && !isNaN(parsedEnd.getTime()) ?
        Timestamp.fromDate(parsedEnd) :
        parsedEnd;

    const detailsWithMetadata: WithMetadata<MoldCase> = {
      ...persistableDetails,
      start_date: startTimestamp as any,
      end_date: endTimestamp as any,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const moldCase: DocumentSnapshot | null =
      await addMoldCase(detailsWithMetadata);
    if (!moldCase) throw new Error("Cannot add mold case.");

    const createdCase = await retrieveMoldCaseById(moldCase.id);
    if (createdCase) {
      await createCaseCache(createdCase);
    } else {
      await invalidateMoldCaseListCaches();
    }

    await invalidateMoldCaseSummaryCaches();

    return createdCase ?? (documentToJson<MoldCase>(moldCase) as MoldCaseResponse);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldCasesByUser = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<PaginatedResult<MoldCaseResponse[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      uid,
      limit,
      isArchived,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldCaseResponse[]>>("v2:mold-cases-all", cacheQuery, {useCache: true});
    if (cached) return cached;

    const cases: PaginatedResult<QuerySnapshot> | null = await findAllMoldCases(
      uid,
      limit,
      isArchived,
      token
    );
    if (!cases) throw new Error("No cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => normalizeCaseResponse(c));
    const hydrated = await rehydrateCaseNamesBatch(normalized as MoldCaseResponse[]);

    // Transform photo URLs and cultivation log image URLs
    const transformed = await Promise.all(
      hydrated.map((c) => transformMoldCaseImages(c))
    );

    const response = {
      snapshot: transformed,
      nextPageToken: cases.nextPageToken,
    };

    // Cache the results
    await cacheList("v2:mold-cases-all", response, cacheQuery, {ttl: MOLD_CASE_SERVICE_TTL_SECONDS});

    return response;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAssignedMoldCases = async (
  mycologistId: string,
  limit: number,
  token?: string
): Promise<PaginatedResult<MoldCaseResponse[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      mycologistId,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldCaseResponse[]>>("v2:mold-cases-assigned", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit assigned mold cases for mycologist=${mycologistId}`);
      return cached;
    }

    const cases: PaginatedResult<QuerySnapshot> | null =
      await findAssignedMoldCases(mycologistId, limit, token);
    if (!cases) throw new Error("No assigned cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => normalizeCaseResponse(c));
    const hydrated = await rehydrateCaseNamesBatch(normalized as MoldCaseResponse[]);

    // Transform photo URLs and cultivation log image URLs
    const transformed = await Promise.all(
      hydrated.map((c) => transformMoldCaseImages(c))
    );

    const response = {
      snapshot: transformed,
      nextPageToken: cases.nextPageToken,
    };

    // Cache the results
    await cacheList("v2:mold-cases-assigned", response, cacheQuery, {ttl: MOLD_CASE_SERVICE_TTL_SECONDS});

    return response;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const searchAssignedMoldCasesByMycologist = async (
  mycologistId: string,
  searchQuery?: string,
  priority?: string,
  limit = 10,
  token?: string
): Promise<PaginatedResult<MoldCaseResponse[]> | null> => {
  try {
    const result = await findAssignedMoldCasesWithSearch(mycologistId, searchQuery, priority, limit, token);
    if (!result) throw new Error("No results found.");

    const raw: MoldCase[] = result.snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    } as unknown as MoldCase));

    const normalized = raw.map((c) => normalizeCaseResponse(c));
    const hydrated = await rehydrateCaseNamesBatch(normalized as MoldCaseResponse[]);

    const transformed = await Promise.all(hydrated.map((c) => transformMoldCaseImages(c)));

    return {
      snapshot: transformed,
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldCaseById = async (
  id: string
): Promise<MoldCaseResponse | null> => {
  try {
    const moldCase: DocumentSnapshot | null = await findMoldCaseById(id);
    if (!moldCase) throw new Error("No case found.");
    const cases = documentToJson<MoldCase>(moldCase);
    const copy: any = normalizeCaseResponse(cases);

    const hydrated = await rehydrateCaseNames(copy as MoldCaseResponse);

    // Transform photo URL and cultivation log image URLs
    return await transformMoldCaseImages(hydrated);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldCaseByName = async (
  name: string
): Promise<MoldCase | null> => {
  try {
    const moldCase: QuerySnapshot | null = await findMoldCaseByName(name);
    if (!moldCase) throw new Error("No case found.");
    const cases = queryToJson<MoldCase>(moldCase);
    return cases.length > 0 ? cases[0] : null;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldCasesByMoldipediaId = async (
  moldipediaId: string
): Promise<MoldCaseResponse[] | null> => {
  try {
    const moldCaseSnap: QuerySnapshot | null = await findMoldCasesByMoldipediaId(moldipediaId);
    if (!moldCaseSnap) return null;
    const cases = queryToJson<MoldCase>(moldCaseSnap);
    if (cases.length === 0) return null;

    const normalized = cases.map((c) => normalizeCaseResponse(c));
    const hydrated = await rehydrateCaseNamesBatch(normalized as MoldCaseResponse[]);
    const transformed = await Promise.all(hydrated.map((c) => transformMoldCaseImages(c)));
    return transformed;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldCaseByReportId = async (
  reportId: string,
  preferredUserId?: string
): Promise<MoldCaseResponse | null> => {
  try {
    const moldCaseSnap: QuerySnapshot | null =
      await findMoldCaseByReportId(reportId);
    if (!moldCaseSnap) throw new Error("No case found for this report.");
    const cases = queryToJson<MoldCase>(moldCaseSnap);
    if (cases.length === 0) return null;
    if (cases.length > 1) {
      devLog(`[retrieveMoldCaseByReportId] Duplicate cases found for report=${reportId}; count=${cases.length}`);
    }

    // If multiple cases exist for this report, prefer active + owner-matching records,
    // then fall back to the most recent one.
    const toMillis = (value: any): number => {
      if (!value) return 0;
      if (value instanceof Timestamp) return value.toDate().getTime();
      if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate().getTime();
      }
      if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return 0;
    };

    const activeCases = cases.filter((c: any) => !c?.is_archived);
    const ownerMatched = preferredUserId ?
      activeCases.filter((c: any) => c?.user_id === preferredUserId) :
      [];

    const candidatePool = ownerMatched.length > 0 ?
      ownerMatched :
      (activeCases.length > 0 ? activeCases : cases);

    const mostRecent = candidatePool.reduce((prev, current) => {
      const prevCreatedAt = (prev as any)?.metadata?.created_at;
      const currCreatedAt = (current as any)?.metadata?.created_at;
      return toMillis(currCreatedAt) > toMillis(prevCreatedAt) ? current : prev;
    }, candidatePool[0]);

    // normalize dates and ensure photo_url is a string
    const raw = mostRecent;
    const normalized: any = {...raw};

    // Ensure photo_url is a string or null (not a Firestore object)
    if (normalized.photo_url && typeof normalized.photo_url !== "string") {
      normalized.photo_url = null;
    }

    const dateNormalized = normalizeCaseResponse(raw);
    normalized.start_date = (dateNormalized as any).start_date;
    normalized.end_date = (dateNormalized as any).end_date;

    const hydrated = await rehydrateCaseNames(normalizeCaseResponse(normalized as MoldCaseResponse));

    // Transform photo URL and cultivation log image URLs
    return await transformMoldCaseImages(hydrated);
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Batch-retrieve mold cases for multiple report IDs in a single Firestore query.
 * Returns a Map<reportId, MoldCase> for O(1) lookups.
 * Uses Firestore 'in' operator (max 30 per batch, chunked automatically).
 */
export const batchRetrieveMoldCasesByReportIds = async (
  reportIds: string[]
): Promise<Map<string, MoldCase>> => {
  const resultMap = new Map<string, MoldCase>();
  if (!reportIds || reportIds.length === 0) return resultMap;

  try {
    // Firestore 'in' operator supports up to 30 values; chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < reportIds.length; i += 30) {
      chunks.push(reportIds.slice(i, i + 30));
    }

    const db = getDb();
    const col = getCollectionName(FirestoreCollection.MOLD_CASES);

    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        db.collection(col)
          .where("mold_report_id", "in", chunk)
          .get()
      )
    );

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const data = doc.data() as MoldCase;
        if (data.mold_report_id) {
          resultMap.set(data.mold_report_id, {
            ...data,
            id: doc.id,
          } as any);
        }
      }
    }

    devLog(`[BATCH_CASES] Fetched ${resultMap.size} cases for ${reportIds.length} report IDs`);
  } catch (error) {
    devLog(error, "BATCH_CASES_ERROR");
  }

  return resultMap;
};

export const updateMoldCaseInFirestore = async (
  id: string,
  details: Partial<MoldCase>
): Promise<MoldCaseResponse | null> => {
  try {
    // convert start_date/end_date strings to Timestamps if present
    const updatedDetails: any = {...details};
    if (updatedDetails.start_date) {
      const raw = updatedDetails.start_date;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.start_date =
        parsed instanceof Date && !isNaN(parsed.getTime()) ?
          Timestamp.fromDate(parsed) :
          updatedDetails.start_date;
    }
    if (updatedDetails.end_date) {
      const raw = updatedDetails.end_date;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.end_date =
        parsed instanceof Date && !isNaN(parsed.getTime()) ?
          Timestamp.fromDate(parsed) :
          updatedDetails.end_date;
    }

    const result: WriteResult | null = await updateMoldCaseRepo(
      id,
      updatedDetails
    );
    if (!result) throw new Error("Failed to update mold case.");

    const updatedCase = await retrieveMoldCaseById(id);
    if (!updatedCase) {
      await invalidateMoldCaseListCaches();
      await invalidateMoldCaseSummaryCaches();
      return null;
    }

    if (caseUpdateAffectsMembership(updatedDetails)) {
      await invalidateMoldCaseListCaches();
    } else {
      await replaceCaseCaches(id, updatedCase);
    }

    await invalidateMoldCaseSummaryCaches();

    return updatedCase;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldCase = async (id: string): Promise<void> => {
  try {
    const current = await retrieveMoldCaseById(id);
    if (!current) throw new Error("No case found.");

    const result: WriteResult | null = await softDeleteMoldCase(id);
    if (!result) throw new Error("Failed to soft delete mold case");

    await removeCaseCaches(id, current);
    await invalidateMoldCaseSummaryCaches();
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldCase = async (id: string): Promise<void> => {
  try {
    const current = await retrieveMoldCaseById(id);
    if (!current) throw new Error("No case found.");

    const result: WriteResult | null = await deleteMoldCase(id);
    if (!result) throw new Error("Failed to delete mold case");

    await removeCaseCaches(id, current);
    await invalidateMoldCaseSummaryCaches();
  } catch (error) {
    devLog(error);
  }
};

/**
 * Retrieve cultivation logs for a case from the subcollection.
 * Returns a paginated list of logs with signed image URLs.
 */
export const getCultivationLogsFromCase = async (
  caseId: string,
  limit = 50,
  token?: string
): Promise<PaginatedResult<WithMetadataAndId<CultivationLog>[]> | null> => {
  try {
    // Ensure the parent case exists
    const moldCase = await findMoldCaseById(caseId);
    if (!moldCase) throw new Error("No case found.");

    const result = await findCultivationLogsByCaseId(caseId, limit, token);
    if (!result) return {snapshot: [], nextPageToken: null};

    const logs: WithMetadataAndId<CultivationLog>[] = result.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as WithMetadataAndId<CultivationLog>));

    // Transform image URLs
    const transformed = await Promise.all(logs.map(transformLogImageUrl));

    return {
      snapshot: transformed,
      nextPageToken: result.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Remove a cultivation log by its document ID (subcollection).
 * Returns the deleted log or null.
 */
export const removeCultivationLogFromCase = async (
  caseId: string,
  logId: string
): Promise<boolean> => {
  try {
    const result = await deleteCultivationLogRepo(caseId, logId);
    if (!result) throw new Error("Failed to remove cultivation log");
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

/**
 * Add a cultivation log to the subcollection.
 * Returns the newly created log document with its ID.
 */
export const addCultivationLogToCase = async (
  caseId: string,
  log: CultivationLog
): Promise<WithMetadataAndId<CultivationLog> | null> => {
  try {
    const doc = await addCultivationLogRepo(caseId, log);
    if (!doc) throw new Error("Failed to add cultivation log");

    const created: WithMetadataAndId<CultivationLog> = {
      id: doc.id,
      ...(doc.data() as WithMetadata<CultivationLog>),
    };

    // Transform image URL in the returned log
    return await transformLogImageUrl(created);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateCultivationDetailsInCase = async (
  caseId: string,
  details: CultivationDetailsUpdate
): Promise<MoldCaseResponse | null> => {
  try {
    const result = await updateCultivationDetails(caseId, details);
    if (!result) throw new Error("Failed to update cultivation details");

    const updated = await retrieveMoldCaseById(caseId);
    if (updated) {
      await replaceCaseCaches(caseId, updated);
    } else {
      await invalidateMoldCaseListCaches();
    }
    await invalidateMoldCaseSummaryCaches();
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Get combined total counts for dashboard
 * Includes user counts (by role, active/inactive), mold report status counts, and mold case priority counts
 * Results are cached for 1 hour (3600 seconds)
 */
export const getCombinedTotalCounts = async (): Promise<{
  users: Record<string, number> | null;
  userStatus: {active: number; inactive: number} | null;
  moldReports: {
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    rejected: number;
  } | null;
  moldCases: {low: number; medium: number; high: number} | null;
} | null> => {
  try {
    // Check cache first
    const cacheKey = "combined-total-counts";
    const cached = await getCachedItem<any>(
      "dashboard",
      cacheKey
    );
    if (cached) return cached;

    // Cache miss - fetch all counts in parallel
    const [roleCounts, userStatusCounts, reportCounts, caseCounts] = await Promise.all([
      getRoleCounts(),
      getDisabledCounts(),
      getMoldReportStatusCounts(),
      countCasesByPriority(),
    ]);

    const result = {
      users: roleCounts,
      userStatus: userStatusCounts,
      moldReports: reportCounts,
      moldCases: caseCounts,
    };

    // Cache the result for 1 hour
    await cacheItem("dashboard", cacheKey, result, {ttl: 3600});

    return result;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Get mold case priority breakdown counts
 * Returns counts for low, medium, and high priority cases
 * Results are cached for 1 hour (3600 seconds)
 */
export const getMoldCasePriorityBreakdown = async (): Promise<{
  low: number;
  medium: number;
  high: number;
} | null> => {
  try {
    // Check cache first
    const cacheKey = "priority-breakdown";
    const cached = await getCachedItem<{low: number; medium: number; high: number}>(
      "mold-cases",
      cacheKey
    );
    if (cached) return cached;

    // Cache miss - fetch priority counts
    const counts = await countCasesByPriority();
    if (!counts) return null;

    // Cache the result for 1 hour
    await cacheItem("mold-cases", cacheKey, counts, {ttl: 3600});

    return counts;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Get total count of mold cases and metadata (latest createdAt)
 * Admin only
 */
export const getMoldCasesCountWithMetadata = async (): Promise<{
  count: number;
  createdAt: string;
} | null> => {
  try {
    const cacheKey = "mold-cases-count-metadata";
    const cached = await getCachedItem<{count: number; createdAt: string}>(
      "dashboard",
      cacheKey
    );
    if (cached) return cached;

    const metadata = await countAllMoldCasesWithMetadata();
    if (!metadata) return null;

    // Cache the result for 5 minutes
    await cacheItem("dashboard", cacheKey, metadata, {ttl: MOLD_CASE_SERVICE_TTL_SECONDS});

    return metadata;
  } catch (error) {
    devLog(error);
    return null;
  }
};

