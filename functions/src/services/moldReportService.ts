import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {cacheItem, getCachedItem} from "../utils/cacheManager";
import {
  addMoldReport,
  deleteMoldReport,
  findAllMoldReports,
  findUnassignedMoldReports,
  findReportsByAssignedMycologist,
  findMoldReportById,
  softDeleteMoldReport,
  updateMoldReport as updateMoldReportRepo,
  appendCaseDetail as appendCaseDetailRepo,
  countReportsByStatuses,
  countTotalReports,
  findAllMoldReportsByUser,
  countReportsByAssignedMycologist,
  findMoldReportsBySearch,
  countReportsByDateRange,
} from "../repositories/moldReportRepository";
import {findMoldCasesByPriority} from "../repositories/moldCaseRepository";
import {
  APIUser,
  MoldReport,
  MoldReportDetails,
  PaginatedResult,
  WithId,
  WithMetadata,
} from "../types/types";
import {getAuthUserById} from "../lib/auth";
import {retrieveMoldCaseByReportId} from "./moldCaseService";
import {transformToSignedUrl} from "../utils/storageTransform";

// Helper: transform cover_photo arrays to signed URLs
const transformCoverPhotos = async (
  caseDetails: Array<any>
): Promise<Array<any>> => {
  if (!Array.isArray(caseDetails)) {
    devLog(`transformCoverPhotos: caseDetails is not an array: ${typeof caseDetails}`);
    return caseDetails;
  }

  devLog(`transformCoverPhotos: Processing ${caseDetails.length} case details`);

  return Promise.all(
    caseDetails.map(async (detail, idx) => {
      if (!detail.cover_photo) {
        devLog(`transformCoverPhotos[${idx}]: No cover_photo field`);
        return detail;
      }

      if (!Array.isArray(detail.cover_photo)) {
        devLog(`transformCoverPhotos[${idx}]: cover_photo is not an array: ${typeof detail.cover_photo}`);
        return detail;
      }

      devLog(`transformCoverPhotos[${idx}]: Found ${detail.cover_photo.length} photos to transform`);

      const transformedPhotos = await Promise.all(
        detail.cover_photo.map(async (photoPath: string, photoIdx: number) => {
          devLog(`transformCoverPhotos[${idx}][${photoIdx}]: Transforming: ${photoPath}`);
          const signedUrl = await transformToSignedUrl(photoPath);
          devLog(`transformCoverPhotos[${idx}][${photoIdx}]: Result: ${signedUrl ? "SUCCESS" : "FAILED"} - ${signedUrl}`);
          return signedUrl;
        })
      );

      const filteredPhotos = transformedPhotos.filter((url) => url !== null);
      devLog(`transformCoverPhotos[${idx}]: Filtered ${filteredPhotos.length}/${transformedPhotos.length} photos (removed nulls)`);

      return {
        ...detail,
        cover_photo: filteredPhotos,
      };
    })
  );
};

// Helper: convert date_observed Timestamp to ISO string for client responses
const normalizeDateObserved = <T>(obj: T): T => {
  if (!obj || typeof obj !== "object") return obj;
  const copy: any = {...obj};
  const v = copy.date_observed;
  if (v && typeof v === "object" && (v as any).toDate instanceof Function) {
    try {
      copy.date_observed = (v as any).toDate().toISOString();
    } catch (e) {
      // leave as-is if conversion fails
    }
  }
  return copy as T;
};

export const addMoldReportToFirestore = async (
  details: MoldReport
): Promise<MoldReport | null> => {
  try {
    devLog(`addMoldReportToFirestore: Creating report with case_name="${details.case_name}"`);
    devLog(`addMoldReportToFirestore: case_details type: ${typeof details.case_details}, isArray: ${Array.isArray(details.case_details)}`);

    // Ensure case_details is treated as an array and attach metadata to each entry
    const caseDetailsArray = Array.isArray(details.case_details) ?
      details.case_details :
      [];

    devLog(`addMoldReportToFirestore: case_details count: ${caseDetailsArray.length}`);
    caseDetailsArray.forEach((d: any, idx: number) => {
      devLog(`addMoldReportToFirestore[${idx}]: cover_photo=${JSON.stringify(d.cover_photo)}, description="${d.description}"`);
    });

    const caseDetailsWithMeta: WithMetadata<MoldReportDetails>[] =
      caseDetailsArray.map((d) => ({
        ...d,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      }));

    // convert date_observed (string from DTO) to Firestore Timestamp
    const rawDate = details.date_observed;
    const parsedDate =
      typeof rawDate === "string" ? new Date(rawDate) : rawDate;
    const dateObservedTimestamp =
      parsedDate instanceof Date && !isNaN(parsedDate.getTime()) ?
        Timestamp.fromDate(parsedDate) :
        Timestamp.now();

    const detailsWithMetadata: WithMetadata<MoldReport> = {
      ...details,
      date_observed: dateObservedTimestamp,
      case_details: caseDetailsWithMeta,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addMoldReport(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add mold report.");
    devLog("addMoldReportToFirestore: ✅ Report created successfully");
    return documentToJson<MoldReport>(doc);
  } catch (error) {
    devLog(`addMoldReportToFirestore: ❌ Error - ${error}`);
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldReports = async (
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllMoldReports(limit, token);
    if (!docs) throw new Error("No mold reports found.");
    console.log(
      "[DEBUG] retrieveAllMoldReports - raw snapshot size:",
      docs.snapshot.size
    );
    const raw = queryToJson<MoldReport>(docs.snapshot);
    console.log("[DEBUG] retrieveAllMoldReports - parsed count:", raw.length);
    console.log(
      "[DEBUG] retrieveAllMoldReports - report IDs:",
      raw.map((r) => r.id)
    );
    // Normalize date_observed and enrich each report with reporter info in parallel
    const enriched = await Promise.all(
      raw.map(async (r) => {
        const nr = normalizeDateObserved(r) as unknown as MoldReport & any;
        try {
          const authUser = await getAuthUserById(nr.user_id);
          if (authUser) {
            nr.reporter = {
              id: authUser.id,
              name:
                authUser.details.displayName ||
                authUser.user.first_name + " " + authUser.user.last_name,
            };
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_USER");
        }
        // Enrich with mold case if available
        try {
          const moldCase = await retrieveMoldCaseByReportId(nr.id);
          if (moldCase) {
            nr.mold_case = {
              priority: moldCase.priority,
            };
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_CASE");
        }

        // Transform cover photos to signed URLs
        if (nr.case_details) {
          nr.case_details = await transformCoverPhotos(nr.case_details);
        }

        return nr as MoldReport;
      })
    );

    // Apply archive filter (documents with metadata.deleted_at are considered archived)
    const filtered = enriched.filter((r) => {
      const deletedAt = (r as any)?.metadata?.deleted_at;
      const isDeleted = !!deletedAt;
      return isArchived ? isDeleted : !isDeleted;
    });

    return {
      snapshot: filtered,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldReportsByUser = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<PaginatedResult<Omit<MoldReport, "user_id">[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllMoldReportsByUser(uid, limit, isArchived, token);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);
    // Remove user_id from each report
    // eslint-disable-next-line
    const sanitized = raw.map(({user_id, ...rest}) => rest) as Omit<
      MoldReport,
      "user_id"
    >[];
    return {
      snapshot: sanitized,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldReportById = async (
  id: string
): Promise<MoldReport | null> => {
  try {
    devLog(`retrieveMoldReportById: Fetching report ID: ${id}`);
    const doc: DocumentSnapshot | null = await findMoldReportById(id);
    if (!doc) {
      devLog(`retrieveMoldReportById: ❌ Document not found for ID: ${id}`);
      throw new Error("No mold report found.");
    }

    const raw = documentToJson<MoldReport>(doc);
    devLog(`retrieveMoldReportById: Raw data case_details: ${JSON.stringify(raw.case_details)}`);

    const nr = normalizeDateObserved(raw) as unknown as MoldReport & any;
    try {
      const authUser = await getAuthUserById(nr.user_id);
      if (authUser) {
        nr.reporter = {
          id: authUser.id,
          user: authUser.user,
          details: authUser.details,
        } as WithId<APIUser>;
      }
    } catch (e) {
      devLog(e, "ENRICH_REPORT_USER");
    }

    // Transform cover photos to signed URLs
    if (nr.case_details) {
      devLog(`retrieveMoldReportById: Transforming cover photos for ${nr.case_details.length} case details`);
      nr.case_details = await transformCoverPhotos(nr.case_details);
      devLog(`retrieveMoldReportById: After transform case_details: ${JSON.stringify(nr.case_details)}`);
    }

    devLog("retrieveMoldReportById: ✅ Report retrieved successfully");
    return nr;
  } catch (error) {
    devLog(`retrieveMoldReportById: ❌ Error - ${error}`);
    devLog(error);
    return null;
  }
};

export const retrieveUnassignedMoldReports = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findUnassignedMoldReports(limit, token);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);
    return {
      snapshot: raw,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAssignedMoldReports = async (
  mycologistId: string,
  limit: number,
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findReportsByAssignedMycologist(mycologistId, limit, token);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);
    return {
      snapshot: raw,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const addCaseDetailToReport = async (
  reportId: string,
  detail: MoldReportDetails
): Promise<MoldReport | null> => {
  try {
    const detailWithMeta: WithMetadata<MoldReportDetails> = {
      ...detail,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };

    const result = await appendCaseDetailRepo(reportId, detailWithMeta);
    if (!result) throw new Error("Failed to add case detail to report.");
    return await retrieveMoldReportById(reportId);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldReportInFirestore = async (
  id: string,
  details: Partial<MoldReport>
): Promise<MoldReport | null> => {
  try {
    // convert date_observed string to Timestamp if present
    const updatedDetails: any = {...details};
    if (updatedDetails.date_observed) {
      const raw = updatedDetails.date_observed;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.date_observed =
        parsed instanceof Date && !isNaN(parsed.getTime()) ?
          Timestamp.fromDate(parsed) :
          updatedDetails.date_observed;
    }

    const result: WriteResult | null = await updateMoldReportRepo(
      id,
      updatedDetails
    );
    if (!result) throw new Error("Failed to update mold report.");
    const updated = await retrieveMoldReportById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldReport = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMoldReport(id);
    if (!result) throw new Error("Failed to soft delete mold report");
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldReport = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldReport(id);
    if (!result) throw new Error("Failed to delete mold report");
  } catch (error) {
    devLog(error);
  }
};

export const getMoldReportStatusCounts = async (): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  closed: number;
} | null> => {
  try {
    // Map current canonical status keys to arrays that include legacy/alternate values.
    // Assumption: older documents might have used variants like 'in_progress' or 'assigned'.
    const mapping: Record<string, string[]> = {
      pending: ["pending"],
      in_progress: ["in progress", "in_progress", "assigned"],
      resolved: ["resolved", "done"],
      rejected: ["closed", "rejected"],
    };

    const total = await countTotalReports();

    const pending = await countReportsByStatuses(mapping.pending);
    const inProgress = await countReportsByStatuses(mapping.in_progress);
    const resolved = await countReportsByStatuses(mapping.resolved);
    const closed = await countReportsByStatuses(mapping.closed);

    return {
      total: total ?? 0,
      pending: pending ?? 0,
      in_progress: inProgress ?? 0,
      resolved: resolved ?? 0,
      closed: closed ?? 0,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getAssignedReportsCount = async (
  mycologistId: string
): Promise<number | null> => {
  try {
    const count = await countReportsByAssignedMycologist(mycologistId);
    return typeof count === "number" ? count : 0;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const searchAndFilterMoldReports = async (
  searchQuery: string | undefined,
  status: string | undefined,
  priority: string | undefined,
  limit: number,
  token?: string,
  userId?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    let reportIds: string[] | undefined;

    // If priority is specified, get report IDs from mold cases first
    if (priority) {
      reportIds = await findMoldCasesByPriority(priority);

      // If no cases match the priority, return empty result
      if (!reportIds || reportIds.length === 0) {
        return {
          snapshot: [],
          nextPageToken: null,
        };
      }
    }

    // Fetch from repository with status filter and optional priority-based IDs
    // When searching, fetch more to ensure we get enough results after filtering
    const fetchLimit = (searchQuery && searchQuery.trim()) ? Math.min(limit * 5, 100) : limit * 3;
    const result = await findMoldReportsBySearch(
      fetchLimit,
      token,
      status,
      reportIds,
      userId
    );

    if (!result || !result.snapshot) return null;

    // Convert Firestore results
    const raw = queryToJson<MoldReport>(result.snapshot);

    // Normalize dates and enrich in parallel
    let reportList = await Promise.all(
      raw.map(async (r) => {
        const nr = normalizeDateObserved(r) as unknown as MoldReport & any;

        // Enrich with reporter info
        try {
          const authUser = await getAuthUserById(nr.user_id);
          if (authUser) {
            nr.reporter = {
              id: authUser.id,
              name:
                authUser.details.displayName ||
                authUser.user.first_name + " " + authUser.user.last_name,
            };
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_USER");
        }

        // Enrich with mold case priority (always try to fetch, may not exist yet)
        try {
          const moldCase = await retrieveMoldCaseByReportId(nr.id);
          if (moldCase) {
            nr.mold_case = {
              priority: moldCase.priority,
            };
          } else {
            // No mold case yet - will show as "unassigned" on frontend
            nr.mold_case = null;
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_CASE");
          nr.mold_case = null;
        }

        // Transform cover photos to signed URLs
        if (nr.case_details) {
          nr.case_details = await transformCoverPhotos(nr.case_details);
        }

        return nr as MoldReport;
      })
    );

    // Apply search filter if query provided (only if priority is not specified)
    if (searchQuery && searchQuery.trim() && !priority) {
      const query = searchQuery.toLowerCase().trim();
      devLog(`🔍 Searching ${reportList.length} reports for: "${query}"`);

      reportList = reportList.filter((report: any) => {
        const caseName = report.case_name?.toLowerCase() || "";
        const host = report.host?.toLowerCase() || "";
        const location = report.location?.toLowerCase() || "";
        const reporterName = report.reporter?.name?.toLowerCase() || "";
        const reportStatus = report.status?.toLowerCase() || "";
        const description = report.description?.toLowerCase() || "";

        const matches =
          caseName.includes(query) ||
          host.includes(query) ||
          location.includes(query) ||
          reporterName.includes(query) ||
          reportStatus.includes(query) ||
          description.includes(query);

        if (matches) {
          devLog(`✅ Search match: "${report.case_name}" matched query "${query}"`);
        }

        return matches;
      });

      devLog(`🔍 Search complete: ${reportList.length} results`);
    }

    // Trim results to requested limit
    const trimmedResults = reportList.slice(0, limit);

    return {
      snapshot: trimmedResults,
      nextPageToken: reportList.length > limit ? result.nextPageToken : null,
    };
  } catch (error) {
    devLog(error, "searchAndFilterMoldReports error:");
    return null;
  }
};

export const getMoldReportMonthlyTotals = async (year?: number): Promise<Array<{month: string; total: number}> | null> => {
  try {
    const currentYear = year || new Date().getFullYear();
    const cacheKey = `mold-report-monthly-${currentYear}`;

    // Try to get from cache
    const cached = await getCachedItem<Array<{month: string; total: number}>>("mold-reports", cacheKey);
    if (cached) {
      devLog(`[CACHE] Hit monthly totals for ${currentYear}`);
      return cached;
    }

    const monthlyTotals: Array<{month: string; total: number}> = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 1);

      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      const count = await countReportsByDateRange(startTimestamp, endTimestamp);
      const monthName = startDate.toLocaleString("default", {month: "long", year: "numeric"});

      monthlyTotals.push({
        month: monthName,
        total: count ?? 0,
      });
    }

    // Cache result for 1 hour
    await cacheItem("mold-reports", cacheKey, monthlyTotals, {ttl: 3600});

    return monthlyTotals;
  } catch (error) {
    devLog(error);
    return null;
  }
};
