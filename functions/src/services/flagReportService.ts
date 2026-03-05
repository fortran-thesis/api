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
    return documentToJson<FlagReportBase>(doc);
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

      // Resolve reported content display name when possible
      const contentId = r.content_id || r.contentId || r.reported_user_id;
      const contentType = r.content_type || r.contentType || r.type;
      if (contentType === "user" && contentId) {
        try {
          const reportedUser = await getAuthUserById(contentId);
          if (reportedUser) {
            r.reported = {id: reportedUser.id, name: reportedUser.details?.displayName || `${reportedUser.user?.first_name || ""} ${reportedUser.user?.last_name || ""}`.trim()};
          }
        } catch (e) {
          devLog(e);
        }
      }

      // Fallback: ensure reported contains at least id when no name resolved
      if (!r.reported && contentId) {
        r.reported = {id: contentId, name: ""};
      }

      return r;
    }));

    return {
      snapshot: enriched,
      nextPageToken: querySnap.nextPageToken,
    };
  } catch (error) {
    devLog("[flagReportService] Error retrieving flag reports");
    return null;
  }
};

export const retrieveFlagReportById = async (id: string) => {
  try {
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

    // Resolve reported content name when content_type indicates a user
    const contentId = obj.content_id || obj.contentId || obj.reported_user_id;
    const contentType = obj.content_type || obj.contentType || obj.type;
    if (contentType === "user" && contentId) {
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
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const removeFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await deleteFlagReport(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveFlagReport = async (id: string) => {
  try {
    const result: WriteResult | null = await softDeleteFlagReport(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};
