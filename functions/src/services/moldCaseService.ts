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
import {CultivationLog, MoldCase, PaginatedResult, WithId, WithMetadata} from "../types/types";
import {transformToSignedUrl} from "../utils/storageTransform";
import {cacheItem, getCachedItem, cacheList, getCachedList} from "../utils/cacheManager";
// Cache TTL for this service (in seconds) — keep signed URLs consistent with cached responses
const MOLD_CASE_SERVICE_TTL_SECONDS = 300;
import {getCollectionName, FirestoreCollection} from "../types/models/firestoreCollections";
import {getRoleCounts, getDisabledCounts} from "./userService";
import {getMoldReportStatusCounts} from "./moldReportService";
import {getAuthUserById} from "../lib/auth";

// Helper function to transform MoldCase photo_url to signed URL
const transformMoldCaseImages = async (moldCase: MoldCase): Promise<MoldCase> => {
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

  return transformed;
};

// Helper: transform a single cultivation log's image_url to a signed URL
const transformLogImageUrl = async (log: WithId<CultivationLog>): Promise<WithId<CultivationLog>> => {
  if (log.image_url) {
    log.image_url = await transformToSignedUrl(log.image_url, MOLD_CASE_SERVICE_TTL_SECONDS) || log.image_url;
  }
  return log;
};

export const addMoldCaseToFirestore = async (
  details: MoldCase
): Promise<MoldCase | null> => {
  try {
    // Resolve user_name from user_id if not provided
    let userName = (details as any).user_name;
    if (!userName && details.user_id) {
      try {
        const authUser = await getAuthUserById(details.user_id);
        if (authUser) {
          userName =
            authUser.details.displayName ||
            `${authUser.user.first_name} ${authUser.user.last_name}`.trim();
        }
      } catch (e) {
        devLog(e, "ENRICH_CASE_USER");
      }
    }

    // convert start_date/end_date (strings from DTO) to Firestore Timestamp
    const rawStart = (details as any).start_date;
    const rawEnd = (details as any).end_date;
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
      ...details,
      ...(userName ? {user_name: userName} : {}),
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

    return documentToJson<MoldCase>(moldCase);
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
): Promise<PaginatedResult<MoldCase[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      uid,
      limit,
      isArchived,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldCase[]>>("mold-cases-all", cacheQuery, {useCache: true});
    if (cached) return cached;

    const cases: PaginatedResult<QuerySnapshot> | null = await findAllMoldCases(
      uid,
      limit,
      isArchived,
      token
    );
    if (!cases) throw new Error("No cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => {
      const copy: any = {...c};
      try {
        if (
          copy.start_date &&
          typeof copy.start_date === "object" &&
          (copy.start_date as any).toDate instanceof Function
        ) {
          copy.start_date = (copy.start_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (
          copy.end_date &&
          typeof copy.end_date === "object" &&
          (copy.end_date as any).toDate instanceof Function
        ) {
          copy.end_date = (copy.end_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      return copy as MoldCase;
    });

    // Transform photo URLs and cultivation log image URLs
    const transformed = await Promise.all(
      normalized.map((c) => transformMoldCaseImages(c))
    );

    const response = {
      snapshot: transformed,
      nextPageToken: cases.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-cases-all", response, cacheQuery, {ttl: MOLD_CASE_SERVICE_TTL_SECONDS});

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
): Promise<PaginatedResult<MoldCase[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      mycologistId,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldCase[]>>("mold-cases-assigned", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit assigned mold cases for mycologist=${mycologistId}`);
      return cached;
    }

    const cases: PaginatedResult<QuerySnapshot> | null =
      await findAssignedMoldCases(mycologistId, limit, token);
    if (!cases) throw new Error("No assigned cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => {
      const copy: any = {...c};
      try {
        if (
          copy.start_date &&
          typeof copy.start_date === "object" &&
          (copy.start_date as any).toDate instanceof Function
        ) {
          copy.start_date = (copy.start_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (
          copy.end_date &&
          typeof copy.end_date === "object" &&
          (copy.end_date as any).toDate instanceof Function
        ) {
          copy.end_date = (copy.end_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      return copy as MoldCase;
    });

    // Transform photo URLs and cultivation log image URLs
    const transformed = await Promise.all(
      normalized.map((c) => transformMoldCaseImages(c))
    );

    const response = {
      snapshot: transformed,
      nextPageToken: cases.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-cases-assigned", response, cacheQuery, {ttl: MOLD_CASE_SERVICE_TTL_SECONDS});

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
): Promise<PaginatedResult<MoldCase[]> | null> => {
  try {
    const result = await findAssignedMoldCasesWithSearch(mycologistId, searchQuery, priority, limit, token);
    if (!result) throw new Error("No results found.");

    const raw: MoldCase[] = result.snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    } as unknown as MoldCase));

    const normalized = raw.map((c) => {
      const copy: any = {...c};
      try {
        if (copy.start_date && typeof copy.start_date === "object" && (copy.start_date as any).toDate instanceof Function) {
          copy.start_date = (copy.start_date as any).toDate().toISOString();
        }
      } catch (e) {/* ignore */}
      try {
        if (copy.end_date && typeof copy.end_date === "object" && (copy.end_date as any).toDate instanceof Function) {
          copy.end_date = (copy.end_date as any).toDate().toISOString();
        }
      } catch (e) {/* ignore */}
      return copy as MoldCase;
    });

    const transformed = await Promise.all(normalized.map((c) => transformMoldCaseImages(c)));

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
): Promise<MoldCase | null> => {
  try {
    const moldCase: DocumentSnapshot | null = await findMoldCaseById(id);
    if (!moldCase) throw new Error("No case found.");
    const cases = documentToJson<MoldCase>(moldCase);
    const copy: any = {...cases};
    try {
      if (
        copy.start_date &&
        typeof copy.start_date === "object" &&
        (copy.start_date as any).toDate instanceof Function
      ) {
        copy.start_date = (copy.start_date as any).toDate().toISOString();
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (
        copy.end_date &&
        typeof copy.end_date === "object" &&
        (copy.end_date as any).toDate instanceof Function
      ) {
        copy.end_date = (copy.end_date as any).toDate().toISOString();
      }
    } catch (e) {
      /* ignore */
    }

    // Transform photo URL and cultivation log image URLs
    return await transformMoldCaseImages(copy as MoldCase);
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

export const retrieveMoldCaseByReportId = async (
  reportId: string,
  preferredUserId?: string
): Promise<MoldCase | null> => {
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

    if (
      raw.start_date &&
      typeof (raw.start_date as any).toDate === "function"
    ) {
      normalized.start_date = (raw.start_date as any).toDate().toISOString();
    }
    if (raw.end_date && typeof (raw.end_date as any).toDate === "function") {
      normalized.end_date = (raw.end_date as any).toDate().toISOString();
    }

    // Enrich with mycologist display name
    if (normalized.mycologist_id) {
      try {
        const authUser = await getAuthUserById(normalized.mycologist_id);
        if (authUser) {
          normalized.mycologist_name =
            authUser.details.displayName ||
            authUser.user.first_name + " " + authUser.user.last_name;
        }
      } catch (e) {
        devLog(e, "ENRICH_CASE_MYCOLOGIST");
      }
    }

    // Transform photo URL and cultivation log image URLs
    return await transformMoldCaseImages(normalized as MoldCase);
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
): Promise<MoldCase | null> => {
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

    // Handle cultivation_details if it's provided as a nested object
    // Convert it to use dot notation for proper nesting in Firestore
    if (updatedDetails.cultivation_details !== undefined) {
      const cultivationDetails = updatedDetails.cultivation_details;
      delete updatedDetails.cultivation_details; // Remove the nested object

      // Add each field with dot notation
      if (cultivationDetails.growth_medium !== undefined) {
        updatedDetails["cultivation_details.growth_medium"] =
          cultivationDetails.growth_medium;
      }
      if (cultivationDetails.in_vivo_details !== undefined) {
        updatedDetails["cultivation_details.in_vivo_details"] =
          cultivationDetails.in_vivo_details;
      }
      if (cultivationDetails.in_vitro_details !== undefined) {
        updatedDetails["cultivation_details.in_vitro_details"] =
          cultivationDetails.in_vitro_details;
      }
    }

    const result: WriteResult | null = await updateMoldCaseRepo(
      id,
      updatedDetails
    );
    if (!result) throw new Error("Failed to update mold case.");

    const updatedCase = await retrieveMoldCaseById(id);
    return updatedCase;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldCase = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMoldCase(id);
    if (!result) throw new Error("Failed to soft delete mold case");
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldCase = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldCase(id);
    if (!result) throw new Error("Failed to delete mold case");
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
): Promise<PaginatedResult<WithId<CultivationLog>[]> | null> => {
  try {
    // Ensure the parent case exists
    const moldCase = await findMoldCaseById(caseId);
    if (!moldCase) throw new Error("No case found.");

    const result = await findCultivationLogsByCaseId(caseId, limit, token);
    if (!result) return {snapshot: [], nextPageToken: null};

    const logs: WithId<CultivationLog>[] = result.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as WithId<CultivationLog>));

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
): Promise<WithId<CultivationLog> | null> => {
  try {
    const doc = await addCultivationLogRepo(caseId, log);
    if (!doc) throw new Error("Failed to add cultivation log");

    const created: WithId<CultivationLog> = {
      id: doc.id,
      ...doc.data() as CultivationLog,
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
  details: {
    cultivation_details?: Record<string, unknown>;
    in_vivo_details?: Record<string, unknown>;
    in_vitro_details?: Record<string, unknown>;
    [key: string]: unknown;
  }
): Promise<MoldCase | null> => {
  try {
    const result = await updateCultivationDetails(caseId, details as any);
    if (!result) throw new Error("Failed to update cultivation details");

    const updated = await retrieveMoldCaseById(caseId);
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

