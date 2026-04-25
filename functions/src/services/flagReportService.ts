import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addFlagReport,
  deleteFlagReport,
  findAllFlagReports,
  findFlagReportById,
  softDeleteFlagReport,
  updateFlagReport,
} from "../repositories/flagReportRepository";
import {FlagReportBase, PaginatedResult, WithMetadata} from "../types/types";
import {getAuthUserById, getAuthUserNamesByIds} from "../lib/auth";
import {retrieveMoldipediaById} from "./moldipediaService";
import {
  cacheItem,
  cacheList,
  getCachedItem,
  getCachedList,
  invalidateItem,
  removeCachedListItem,
  replaceCachedListItem,
  upsertCachedListItem,
} from "../utils/cacheManager";

const RESOURCE = "flag-reports";
const TTL = 300;

export const addFlagReportToFirestore = async (
  details: FlagReportBase
): Promise<FlagReportBase | null> => {
  try {
    const detailsWithTimestamp: WithMetadata<FlagReportBase> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addFlagReport(detailsWithTimestamp);
    if (!doc) throw new Error("Cannot add flag report.");
    const report = documentToJson<FlagReportBase>(doc);

    await Promise.all([
      cacheItem(RESOURCE, (report as any).id, report, {ttl: TTL}),
      upsertCachedListItem(RESOURCE, report, {
        shouldMutate: () => true,
      }),
    ]);

    return report;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllFlagReports = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<FlagReportBase[]> | null> => {
  try {
    const query = {limit, pageToken: token || null};
    const cached = await getCachedList<PaginatedResult<FlagReportBase[]>>(RESOURCE, query);
    if (cached) return cached;

    const querySnap: PaginatedResult<QuerySnapshot> | null =
      await findAllFlagReports(limit, token);
    if (!querySnap) {
      devLog("[flagReportService] Query error - possible missing Firestore composite index");
      return null;
    }
    // Return empty result set if no documents found (this is valid, not an error)
    const raw = queryToJson<FlagReportBase>(querySnap.snapshot);

    // Batch-fetch reporter display names to avoid N+1
    const uniqueReporterIds = [...new Set(raw.map((r: any) => r.reporterId || r.reporter_id).filter(Boolean))];

    const namesMap = uniqueReporterIds.length > 0 ? await getAuthUserNamesByIds(uniqueReporterIds) : new Map<string, string>();

    const enriched = await Promise.all(raw.map(async (r: any) => {
      const reporterId = r.reporterId || r.reporter_id;
      if (reporterId) {
        r.reporter = {id: reporterId, name: namesMap.get(reporterId) || ""};
      }

      // Populate a convenient top-level created_at from metadata.created_at for frontend
      const metaCreated = r.metadata?.created_at;
      if (!r.created_at && metaCreated) {
        try {
          if (typeof metaCreated === "object" && ("_seconds" in metaCreated || "seconds" in metaCreated)) {
            const secs = (metaCreated._seconds ?? (metaCreated as any).seconds) as number;
            r.created_at = new Date(secs * 1000).toISOString();
          } else if (metaCreated && typeof (metaCreated as any).toDate === "function") {
            r.created_at = (metaCreated as any).toDate().toISOString();
          } else if (typeof metaCreated === "string") {
            r.created_at = metaCreated;
          }
        } catch (e) {
          devLog(e);
        }
      }

      // Resolve reported content display name when possible
      const contentId = r.content_id || r.contentId || r.reported_user_id;
      const contentTypeRaw = r.content_type || r.contentType || r.type || "";
      const contentType = contentTypeRaw.toString().toLowerCase();
      if (contentType === "user" && contentId) {
        try {
          const reportedUser = await getAuthUserById(contentId);
          if (reportedUser) {
            r.reported = {id: reportedUser.id, name: reportedUser.details?.displayName || `${reportedUser.user?.first_name || ""} ${reportedUser.user?.last_name || ""}`.trim()};
          }
        } catch (e) {
          devLog(e);
        }
      } else if (contentId && (contentType === "moldipedia" || contentType === "wiki-article" || contentType.includes("wiki"))) {
        // Fetch article/entry title for reported content when possible
        try {
          const article = await retrieveMoldipediaById(contentId);
          if (article) {
            r.content = article;
          }
        } catch (e) {
          devLog(e);
        }
      }

      return r;
    }));

    const response = {
      snapshot: enriched,
      nextPageToken: querySnap.nextPageToken,
    };

    await cacheList(RESOURCE, response, query, {ttl: TTL});

    return response;
  } catch (error) {
    devLog("[flagReportService] Error retrieving flag reports");
    return null;
  }
};

export const retrieveFlagReportById = async (id: string) => {
  try {
    const cached = await getCachedItem<any>(RESOURCE, id);
    if (cached) return cached;

    const doc: DocumentSnapshot | null = await findFlagReportById(id);
    if (!doc || !doc.exists) throw new Error("Flag report not found.");
    const obj = documentToJson<FlagReportBase>(doc) as any;

    const reporterId = obj.reporterId || obj.reporter_id;
    if (reporterId) {
      try {
        const authUser = await getAuthUserById(reporterId);
        if (authUser) {
          obj.reporter = {id: authUser.id, name: authUser.details?.displayName || `${authUser.user?.first_name || ""} ${authUser.user?.last_name || ""}`.trim()};
        }
      } catch (e) {
        devLog(e);
      }
    }

    // Populate top-level created_at from metadata.created_at for frontend
    const metaCreated = obj.metadata?.created_at;
    if (!obj.created_at && metaCreated) {
      try {
        if (typeof metaCreated === "object" && ("_seconds" in metaCreated || "seconds" in metaCreated)) {
          const secs = (metaCreated._seconds ?? (metaCreated as any).seconds) as number;
          obj.created_at = new Date(secs * 1000).toISOString();
        } else if (metaCreated && typeof (metaCreated as any).toDate === "function") {
          obj.created_at = (metaCreated as any).toDate().toISOString();
        } else if (typeof metaCreated === "string") {
          obj.created_at = metaCreated;
        }
      } catch (e) {
        devLog(e);
      }
    }

    // Resolve reported content name when content_type indicates a user
    const contentId = obj.content_id || obj.contentId || obj.reported_user_id;
    const contentType = (obj.content_type || obj.contentType || obj.type || "").toString();
    if (contentType.toLowerCase() === "user" && contentId) {
      try {
        const reportedUser = await getAuthUserById(contentId);
        if (reportedUser) {
          obj.reported = {id: reportedUser.id, name: reportedUser.details?.displayName || `${reportedUser.user?.first_name || ""} ${reportedUser.user?.last_name || ""}`.trim()};
        }
      } catch (e) {
        devLog(e);
      }
    }

    if (!obj.reported && contentId) obj.reported = {id: contentId, name: ""};

    // If the flagged content is a moldipedia/wiki article, fetch its content (body, cover_photo, etc.)
    const lcType = contentType.toLowerCase();
    if (contentId && (lcType === "moldipedia" || lcType === "wiki-article" || lcType.includes("wiki"))) {
      try {
        const article = await retrieveMoldipediaById(contentId);
        if (article) {
          obj.content = article;
        }
      } catch (e) {
        devLog(e);
      }
    }

    await cacheItem(RESOURCE, id, obj, {ttl: TTL});

    return obj;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateFlagReportInFirestore = async (
  id: string,
  details: Partial<FlagReportBase>
) => {
  try {
    const result: WriteResult | null = await updateFlagReport(id, details);
    if (!result) return false;

    const updated = await retrieveFlagReportById(id);
    if (updated) {
      await Promise.all([
        replaceCachedListItem(RESOURCE, id, updated),
        cacheItem(RESOURCE, id, updated, {ttl: TTL}),
      ]);
    }

    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const removeFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await deleteFlagReport(id);
    if (!result) return false;

    await Promise.all([
      removeCachedListItem(RESOURCE, id),
      invalidateItem(RESOURCE, id),
    ]);

    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await softDeleteFlagReport(id);
    if (!result) return false;

    await Promise.all([
      removeCachedListItem(RESOURCE, id),
      invalidateItem(RESOURCE, id),
    ]);

    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};
