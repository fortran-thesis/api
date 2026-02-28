import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {cacheItem, getCachedItem, cacheList, getCachedList, invalidateAllLists} from "../utils/cacheManager";
import {
  addMoldReport,
  deleteMoldReport,
  findAllMoldReports,
  findUnassignedMoldReports,
  findReportsByAssignedMycologist,
  findMoldReportById,
  softDeleteMoldReport,
  updateMoldReport as updateMoldReportRepo,
  countReportsByStatuses,
  countTotalReports,
  findAllMoldReportsByUser,
  countReportsByAssignedMycologist,
  findMoldReportsBySearch,
  countReportsByDateRange,
} from "../repositories/moldReportRepository";
import {
  addCaseDetail as addCaseDetailToSubcollection,
  findAllCaseDetailsByReportId,
} from "../repositories/caseDetailRepository";
import {findMoldCasesByPriority} from "../repositories/moldCaseRepository";
import {
  APIUser,
  MoldReport,
  MoldReportDetails,
  PaginatedResult,
  WithId,
  WithMetadata,
} from "../types/types";
import {getAuthUserById, getAuthUsersByIds} from "../lib/auth";
import {batchRetrieveMoldCasesByReportIds} from "./moldCaseService";
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

    // Extract case_details — they will be written to subcollection, not embedded
    const caseDetailsArray = Array.isArray(details.case_details) ?
      details.case_details :
      [];
    devLog(`addMoldReportToFirestore: ${caseDetailsArray.length} case details will be written to subcollection`);

    // convert date_observed (string from DTO) to Firestore Timestamp
    const rawDate = details.date_observed;
    const parsedDate =
      typeof rawDate === "string" ? new Date(rawDate) : rawDate;
    const dateObservedTimestamp =
      parsedDate instanceof Date && !isNaN(parsedDate.getTime()) ?
        Timestamp.fromDate(parsedDate) :
        Timestamp.now();

    // Build parent document WITHOUT case_details (moved to subcollection)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {case_details: _omitted, ...parentFields} = details;
    const detailsWithMetadata: WithMetadata<Omit<MoldReport, "case_details">> = {
      ...parentFields,
      date_observed: dateObservedTimestamp,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addMoldReport(detailsWithMetadata as any);
    if (!doc) throw new Error("Cannot add mold report.");
    devLog("addMoldReportToFirestore: ✅ Parent document created");

    const reportId = doc.id;

    // Write each case_detail to the subcollection
    if (caseDetailsArray.length > 0) {
      await Promise.all(
        caseDetailsArray.map((d) => addCaseDetailToSubcollection(reportId, d))
      );
      devLog(`addMoldReportToFirestore: ✅ ${caseDetailsArray.length} case details written to subcollection`);
    }

    // Invalidate all report caches since new report was added
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    await invalidateAllLists("mold-reports-assigned");

    // Return with case_details included in response for backward compat
    const result = documentToJson<MoldReport>(doc);
    result.case_details = caseDetailsArray;
    return result;
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
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      isArchived,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldReport[]>>("mold-reports-all", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit all reports for isArchived=${isArchived}, limit=${limit}`);
      return cached;
    }

    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllMoldReports(limit, token, isArchived);
    if (!docs) throw new Error("No mold reports found.");
    devLog(`[DEBUG] retrieveAllMoldReports - raw snapshot size: ${docs.snapshot.size}`);
    const raw = queryToJson<MoldReport>(docs.snapshot);
    devLog(`[DEBUG] retrieveAllMoldReports - parsed count: ${raw.length}`);
    devLog(
      "[DEBUG] retrieveAllMoldReports - report IDs:",
      raw.map((r) => (r as any).id).join(", ")
    );

    // Batch-fetch all Auth users + mold cases upfront instead of N+1 per report
    const uniqueUserIds = [...new Set(raw.map((r) => r.user_id).filter(Boolean))];
    const reportIds = raw.map((r: any) => r.id).filter(Boolean);

    const [authUsersMap, moldCasesMap] = await Promise.all([
      getAuthUsersByIds(uniqueUserIds),
      batchRetrieveMoldCasesByReportIds(reportIds),
    ]);

    // Enrich each report using pre-fetched data (no additional DB calls)
    const enriched = await Promise.all(
      raw.map(async (r) => {
        const nr = normalizeDateObserved(r) as unknown as MoldReport & any;

        // Use pre-fetched auth user
        const authUser = authUsersMap.get(nr.user_id);
        if (authUser) {
          nr.reporter = {
            id: authUser.id,
            name:
              authUser.details.displayName ||
              authUser.user.first_name + " " + authUser.user.last_name,
          };
        }

        // Use pre-fetched mold case
        const moldCase = moldCasesMap.get(nr.id);
        if (moldCase) {
          nr.mold_case = {
            priority: moldCase.priority,
          };
        }

        // case_details now live in subcollection — omit from list responses
        // Clients should fetch via GET /mold-reports/:id for full details
        delete nr.case_details;

        return nr as MoldReport;
      })
    );

    const response = {
      snapshot: enriched,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-all", response, cacheQuery, {ttl: 300});

    return response;
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
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      uid,
      isArchived,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<Omit<MoldReport, "user_id">[]>>("mold-reports-user", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit user reports for uid=${uid}`);
      return cached;
    }

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

    const response = {
      snapshot: sanitized,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-user", response, cacheQuery, {ttl: 300});

    return response;
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
        // Include location as alias for address so mobile clients can read either field
        const detailsWithLocation = {
          ...authUser.details,
          location: authUser.details.address || authUser.user.address || null,
        };
        nr.reporter = {
          id: authUser.id,
          user: authUser.user,
          details: detailsWithLocation,
        } as WithId<APIUser>;
      }
    } catch (e) {
      devLog(e, "ENRICH_REPORT_USER");
    }

    // Fetch case_details from subcollection instead of embedded field
    const detailDocs = await findAllCaseDetailsByReportId(id);
    const caseDetails = detailDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<WithId<MoldReportDetails>>;

    // Transform cover photos to signed URLs
    if (caseDetails.length > 0) {
      devLog(`retrieveMoldReportById: Transforming cover photos for ${caseDetails.length} case details`);
      nr.case_details = await transformCoverPhotos(caseDetails);
      devLog(`retrieveMoldReportById: After transform case_details: ${JSON.stringify(nr.case_details)}`);
    } else {
      nr.case_details = [];
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
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldReport[]>>("mold-reports-unassigned", cacheQuery, {useCache: true});
    if (cached) {
      devLog("[CACHE] Hit unassigned reports");
      return cached;
    }

    const docs: PaginatedResult<QuerySnapshot> | null =
      await findUnassignedMoldReports(limit, token);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);

    const response = {
      snapshot: raw,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-unassigned", response, cacheQuery, {ttl: 300});

    return response;
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
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      mycologistId,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldReport[]>>("mold-reports-assigned", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit assigned reports for mycologist=${mycologistId}`);
      return cached;
    }

    const docs: PaginatedResult<QuerySnapshot> | null =
      await findReportsByAssignedMycologist(mycologistId, limit, token);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);

    const response = {
      snapshot: raw,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-assigned", response, cacheQuery, {ttl: 300});

    return response;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const addCaseDetailToReport = async (
  reportId: string,
  detail: MoldReportDetails
): Promise<WithId<MoldReportDetails> | null> => {
  try {
    const doc = await addCaseDetailToSubcollection(reportId, detail);
    if (!doc) throw new Error("Failed to add case detail to report.");

    // Invalidate all report caches since report was modified
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    await invalidateAllLists("mold-reports-assigned");

    return {
      id: doc.id,
      ...doc.data() as MoldReportDetails,
    };
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

    // Invalidate all report caches since report was updated
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    await invalidateAllLists("mold-reports-assigned");

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

    // Invalidate all report caches since report was deleted
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    await invalidateAllLists("mold-reports-assigned");
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldReport = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldReport(id);
    if (!result) throw new Error("Failed to delete mold report");

    // Invalidate all report caches since report was deleted
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    await invalidateAllLists("mold-reports-assigned");
  } catch (error) {
    devLog(error);
  }
};

export const getMoldReportStatusCounts = async (userId?: string): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  closed: number;
} | null> => {
  try {
    const mapping: Record<string, string[]> = {
      pending: ["pending"],
      in_progress: ["in progress", "in_progress", "assigned"],
      resolved: ["resolved", "done"],
      rejected: ["closed", "rejected"],
    };

    // Parallelize all 5 independent count queries
    const [total, pending, inProgress, resolved, closed] = await Promise.all([
      countTotalReports(userId),
      countReportsByStatuses(mapping.pending, userId),
      countReportsByStatuses(mapping.in_progress, userId),
      countReportsByStatuses(mapping.resolved, userId),
      countReportsByStatuses(mapping.rejected, userId),
    ]);

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
    // Build cache key from search parameters (INCLUDE token for proper pagination)
    const cacheQuery = {
      search: searchQuery || null,
      status: status || null,
      priority: priority || null,
      limit,
      token: token || null,
      userId: userId || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldReport[]>>("mold-reports-search", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit search results for query: ${JSON.stringify(cacheQuery)}`);
      return cached;
    }

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
    // Fetch only slightly more to account for filtering, but not excessively
    // Reduce multiplier to lower database load and prevent rate limiting
    const fetchLimit = (searchQuery && searchQuery.trim()) ? Math.min(limit * 1.5, 50) : limit * 1.2;
    const result = await findMoldReportsBySearch(
      Math.ceil(fetchLimit),
      token,
      status,
      reportIds,
      userId
    );

    if (!result || !result.snapshot) return null;

    // Convert Firestore results
    const raw = queryToJson<MoldReport>(result.snapshot);

    // Apply search filter FIRST on raw data before enrichment (optimization to reduce DB calls)
    let filteredRaw = raw;
    if (searchQuery && searchQuery.trim() && !priority) {
      const query = searchQuery.toLowerCase().trim();
      devLog(`🔍 Pre-filtering ${raw.length} reports for: "${query}"`);

      filteredRaw = raw.filter((report: any) => {
        const caseName = report.case_name?.toLowerCase() || "";
        const host = report.host?.toLowerCase() || "";
        const location = report.location?.toLowerCase() || "";
        const reporterName = report.reporter?.name?.toLowerCase() || "";
        const reportStatus = report.status?.toLowerCase() || "";
        const description = report.description?.toLowerCase() || "";

        return (
          caseName.includes(query) ||
          host.includes(query) ||
          location.includes(query) ||
          reporterName.includes(query) ||
          reportStatus.includes(query) ||
          description.includes(query)
        );
      });

      devLog(`🔍 Pre-filtered to ${filteredRaw.length} results`);
    }

    // Now enrich only the filtered results (or all if no search filter)
    // Then trim to limit to further reduce enrichment calls
    const toEnrich = filteredRaw.slice(0, limit);

    // Batch-fetch all Auth users + mold cases upfront instead of N+1 per report
    const uniqueUserIds = [...new Set(toEnrich.map((r) => r.user_id).filter(Boolean))];
    const enrichReportIds = toEnrich.map((r: any) => r.id).filter(Boolean);

    const [authUsersMap, moldCasesMap] = await Promise.all([
      getAuthUsersByIds(uniqueUserIds),
      batchRetrieveMoldCasesByReportIds(enrichReportIds),
    ]);

    // Normalize dates and enrich using pre-fetched data (no additional DB calls per report)
    const reportList = await Promise.all(
      toEnrich.map(async (r) => {
        const nr = normalizeDateObserved(r) as unknown as MoldReport & any;

        // Use pre-fetched auth user
        const authUser = authUsersMap.get(nr.user_id);
        if (authUser) {
          nr.reporter = {
            id: authUser.id,
            name:
              authUser.details.displayName ||
              authUser.user.first_name + " " + authUser.user.last_name,
          };
        }

        // Use pre-fetched mold case
        const moldCase = moldCasesMap.get(nr.id);
        if (moldCase) {
          nr.mold_case = {
            priority: moldCase.priority,
          };
        } else {
          nr.mold_case = null;
        }

        // case_details now live in subcollection — omit from list responses
        delete nr.case_details;

        return nr as MoldReport;
      })
    );

    // Determine if there are more results beyond what we're returning
    // If we filtered and have more filtered results, use the last ID as token
    // Otherwise use the upstream pagination token if available
    const hasMoreResults = filteredRaw.length > limit && reportList.length > 0;
    const nextToken = hasMoreResults && reportList.length > 0 ? (reportList[reportList.length - 1] as any)?.id : null;

    const response: PaginatedResult<MoldReport[]> = {
      snapshot: reportList,
      nextPageToken: nextToken || result.nextPageToken,
    };

    // Cache the search results for 5 minutes
    await cacheList("mold-reports-search", response, cacheQuery, {ttl: 300});

    return response;
  } catch (error) {
    devLog(error, "searchAndFilterMoldReports error:");
    return null;
  }
};

export const getMoldReportMonthlyTotals = async (year?: number): Promise<Array<{month: string; total: number}> | null> => {
  try {
    const currentYear = year || new Date().getFullYear();
    const cacheKey = `mold-report-monthly-${currentYear}`;

    const cached = await getCachedItem<Array<{month: string; total: number}>>("mold-reports", cacheKey);
    if (cached) {
      devLog(`[CACHE] Hit monthly totals for ${currentYear}`);
      return cached;
    }

    // Parallelize all 12 month queries instead of sequential loop
    const monthPromises = Array.from({length: 12}, (_, month) => {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 1);

      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      return countReportsByDateRange(startTimestamp, endTimestamp).then((count) => ({
        month: startDate.toLocaleString("default", {month: "long", year: "numeric"}),
        total: count ?? 0,
      }));
    });

    const monthlyTotals = await Promise.all(monthPromises);

    await cacheItem("mold-reports", cacheKey, monthlyTotals, {ttl: 3600});

    return monthlyTotals;
  } catch (error) {
    devLog(error);
    return null;
  }
};
