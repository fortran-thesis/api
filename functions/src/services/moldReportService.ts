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
  generateNextDailyCaseName,
} from "../repositories/moldReportRepository";
import {
  addCaseDetail as addCaseDetailToSubcollection,
  findAllCaseDetailsByReportId,
  updateCaseDetail as updateCaseDetailRepo,
} from "../repositories/caseDetailRepository";
import {findMoldCasesByPriority} from "../repositories/moldCaseRepository";
import {
  APIUser,
  Mold,
  MoldCase,
  MoldipediaResponse,
  MoldReport,
  MoldReportDetails,
  PaginatedResult,
  WithId,
  WithMetadata,
} from "../types/types";
import {getAuthUserById, getAuthUsersByIds, getAuthUserNamesByIds} from "../lib/auth";
import {batchRetrieveMoldCasesByReportIds, retrieveMoldCaseByReportId} from "./moldCaseService";
import {transformToSignedUrl} from "../utils/storageTransform";
import {normalizeResponseTimestamps} from "../utils/normalizeResponse";
import {retrieveMoldById, retrieveMoldByName} from "./moldService";
import {retrieveMoldipediaById} from "./moldipediaService";

// Cache TTL for this service (in seconds) — signed URLs should match cached responses
const MOLD_REPORT_SERVICE_TTL_SECONDS = 300;

export interface MoldReportPrintSectionPayload {
  fungus_name: string;
  overview: string;
  description: string;
  health_risks: string;
  affected_hosts: string[];
  symptoms_and_signs: string;
  disease_cycle: string;
  impact: string;
  prevention_summary: string;
  physical_control: string;
  cultural_control: string;
  biological_control: string;
  mechanical_control: string;
  chemical_control: string;
}

export interface MoldReportPrintPayload {
  report: {
    report_id: string;
    report_date: string;
    case_name: string;
    host_plant_affected: string;
    case_status: string;
    confidence_level: string;
    location: string;
    geo_location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      accuracy?: number;
      source?: string;
    };
    date_observed: string;
  };
  identities: {
    reporter_name: string;
    mycologist_name: string;
  };
  sections: MoldReportPrintSectionPayload;
  source: {
    mold_catalog_used: boolean;
    wikimold_used: boolean;
    mold_catalog_id?: string;
    wikimold_id?: string;
  };
}

const toText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
      continue;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (Array.isArray(value)) {
      const joined = value
        .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry ?? "").trim()))
        .filter((entry) => entry.length > 0)
        .join(", ");
      if (joined.length > 0) return joined;
    }
  }

  return "";
};

const toStringList = (...values: unknown[]): string[] => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);
      if (normalized.length > 0) return normalized;
      continue;
    }

    if (typeof value === "string") {
      const normalized = value
        .split(/[,;|\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (normalized.length > 0) return normalized;
    }
  }

  return [];
};

const formatDateLabel = (value: unknown): string => {
  if (!value) return "N/A";

  const asDate = new Date(value as any);
  if (!isNaN(asDate.getTime())) {
    return asDate.toISOString().split("T")[0];
  }

  if (typeof value === "object" && value !== null && "_seconds" in (value as Record<string, unknown>)) {
    const seconds = (value as Record<string, unknown>)._seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString().split("T")[0];
    }
  }

  return "N/A";
};

const normalizeConfidencePercent = (rawValue: unknown): string => {
  if (rawValue === null || rawValue === undefined || rawValue === "") return "N/A";

  const parsed = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
  if (Number.isNaN(parsed)) return "N/A";

  const percent = parsed <= 1 ? parsed * 100 : parsed;
  const clamped = Math.max(0, Math.min(100, percent));
  return `${clamped.toFixed(0)}%`;
};

const parseAdditionalInfoEntry = (
  additionalInfo: unknown,
  aliases: string[]
): string => {
  if (!Array.isArray(additionalInfo)) return "";

  const normalizedAliases = aliases.map((entry) => entry.toLowerCase().trim());
  for (const row of additionalInfo) {
    if (!row || typeof row !== "object") continue;
    const title = String((row as Record<string, unknown>).title ?? "").toLowerCase().trim();
    if (!title) continue;

    if (normalizedAliases.some((alias) => title === alias || title.includes(alias) || alias.includes(title))) {
      return toText((row as Record<string, unknown>).description);
    }
  }

  return "";
};

const parseFindingEntry = (findings: unknown, aliases: string[]): string => {
  if (!Array.isArray(findings)) return "";

  const normalizedAliases = aliases.map((entry) => entry.toLowerCase().trim());
  for (const row of findings) {
    if (!row || typeof row !== "object") continue;
    const title = String((row as Record<string, unknown>).title ?? "").toLowerCase().trim();
    if (!title) continue;

    if (normalizedAliases.some((alias) => title === alias || title.includes(alias) || alias.includes(title))) {
      return toText((row as Record<string, unknown>).content);
    }
  }

  return "";
};

export const retrieveMoldReportPrintPayload = async (
  reportId: string,
  preloadedReport?: MoldReport | null
): Promise<MoldReportPrintPayload | null> => {
  try {
    const report = preloadedReport ?? await retrieveMoldReportById(reportId);
    if (!report) return null;

    const reportDynamic = report as MoldReport & Record<string, unknown>;

    const moldCase = await retrieveMoldCaseByReportId(reportId, report.user_id);
    const moldCaseDynamic = moldCase as (MoldCase & Record<string, unknown>) | null;
    const finalVerdict = moldCase?.final_verdict;
    const lookupTop = Array.isArray(report.lookup_results) && report.lookup_results.length > 0 ? report.lookup_results[0] : null;

    const selectedMoldId = toText(finalVerdict?.moldId, lookupTop?.moldId);
    const selectedMoldName = toText(finalVerdict?.moldName, lookupTop?.moldName);
    const confidenceLevel = normalizeConfidencePercent(finalVerdict?.confidence ?? lookupTop?.confidence);
    const selectedWikiId = toText(finalVerdict?.moldipedia_id);

    const moldCatalogPromise = selectedMoldId ?
      retrieveMoldById(selectedMoldId) :
      (selectedMoldName ? retrieveMoldByName(selectedMoldName) : Promise.resolve(null));
    const wikiPromise = selectedWikiId ? retrieveMoldipediaById(selectedWikiId) : Promise.resolve(null);
    const [moldCatalog, wiki] = await Promise.all([moldCatalogPromise, wikiPromise]);

    const moldInfo = moldCatalog?.mold_details?.info;
    const moldPrevention = moldCatalog?.mold_details?.prevention;
    const moldAdditionalInfo = moldInfo?.additional_info;

    const sections: MoldReportPrintSectionPayload = {
      fungus_name: toText(selectedMoldName, moldCatalog?.name, wiki?.title, "Pending Identification"),
      overview: toText(
        moldInfo?.overview,
        parseAdditionalInfoEntry(moldAdditionalInfo, ["overview"]),
        wiki?.body,
      ),
      description: toText(
        moldInfo?.description,
        wiki?.body,
      ),
      health_risks: toText(
        moldInfo?.health_risks,
        parseAdditionalInfoEntry(moldAdditionalInfo, ["health risks", "health risk", "risk"]),
        parseFindingEntry(wiki?.findings, ["health risks", "health risk"]),
      ),
      affected_hosts: toStringList(
        moldInfo?.affected_hosts,
        parseAdditionalInfoEntry(moldAdditionalInfo, ["affected hosts", "affected crops", "hosts", "host"]),
        wiki?.affected_hosts,
      ),
      symptoms_and_signs: toText(
        moldInfo?.symptoms_and_signs,
        parseAdditionalInfoEntry(moldAdditionalInfo, ["symptoms and signs", "symptoms & signs", "symptoms", "signs"]),
        wiki?.symptoms,
      ),
      disease_cycle: toText(
        parseAdditionalInfoEntry(moldAdditionalInfo, ["disease cycle", "disease cycle spread", "disease cycle spread impact"]),
        wiki?.disease_cycle,
      ),
      impact: toText(
        parseAdditionalInfoEntry(moldAdditionalInfo, ["impact"]),
        wiki?.impact,
      ),
      prevention_summary: toText(
        moldInfo?.prevention_summary,
        parseAdditionalInfoEntry(moldAdditionalInfo, ["prevention summary", "prevention"]),
        wiki?.prevention,
      ),
      physical_control: toText(
        moldPrevention?.physicalControl,
        wiki?.treatments?.physical,
      ),
      cultural_control: toText(
        moldPrevention?.culturalControl,
        wiki?.treatments?.cultural,
      ),
      biological_control: toText(
        moldPrevention?.biologicalControl,
        wiki?.treatments?.biological,
      ),
      mechanical_control: toText(
        moldPrevention?.mechanicalControl,
        wiki?.treatments?.mechanical,
      ),
      chemical_control: toText(
        moldPrevention?.chemicalControl,
        wiki?.treatments?.chemical,
      ),
    };

    const reporterPayload = (reportDynamic.reporter && typeof reportDynamic.reporter === "object") ?
      reportDynamic.reporter as Record<string, unknown> :
      {};
    const reporterDetails = (reporterPayload.details && typeof reporterPayload.details === "object") ?
      reporterPayload.details as Record<string, unknown> :
      {};
    const reporterUser = (reporterPayload.user && typeof reporterPayload.user === "object") ?
      reporterPayload.user as Record<string, unknown> :
      {};

    const reporterName = toText(
      reporterPayload.name,
      reporterDetails.displayName,
      `${String(reporterUser.first_name || "").trim()} ${String(reporterUser.last_name || "").trim()}`.trim(),
      "Unknown Reporter"
    );

    const mycologistName = toText(
      moldCaseDynamic?.mycologist_name,
      moldCase?.mycologist_id,
      "Unassigned"
    );

    const moldCatalogDynamic = moldCatalog as (Mold & Record<string, unknown>) | null;
    const wikiDynamic = wiki as (MoldipediaResponse & Record<string, unknown>) | null;

    return {
      report: {
        report_id: toText(reportDynamic.id, reportId),
        report_date: formatDateLabel(new Date()),
        case_name: toText(report.case_name, `MR-${reportId}`),
        host_plant_affected: toText(report.host, "N/A"),
        case_status: toText(report.status, "pending").toUpperCase(),
        confidence_level: confidenceLevel,
        location: toText(report.location, "N/A"),
        geo_location: reportDynamic.geo_location,
        date_observed: formatDateLabel(report.date_observed),
      },
      identities: {
        reporter_name: reporterName,
        mycologist_name: mycologistName,
      },
      sections,
      source: {
        mold_catalog_used: !!moldCatalog,
        wikimold_used: !!wiki,
        ...(moldCatalogDynamic?.id ? {mold_catalog_id: String(moldCatalogDynamic.id)} : {}),
        ...(wikiDynamic?.id ? {wikimold_id: String(wikiDynamic.id)} : {}),
      },
    };
  } catch (error) {
    devLog(error, "RETRIEVE_MOLD_REPORT_PRINT_PAYLOAD");
    return null;
  }
};

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
        return detail;
      }

      if (!Array.isArray(detail.cover_photo)) {
        return detail;
      }

      const transformedPhotos = await Promise.all(
        detail.cover_photo.map(async (photoPath: string) => {
          const signedUrl = await transformToSignedUrl(photoPath, MOLD_REPORT_SERVICE_TTL_SECONDS);
          return signedUrl;
        })
      );

      const filteredPhotos = transformedPhotos.filter((url) => url !== null);

      return {
        ...detail,
        cover_photo: filteredPhotos,
      };
    })
  );
};

export const getRawCaseCoverPhoto = async (
  reportId: string
): Promise<string | null> => {
  try {
    const detailDocs = await findAllCaseDetailsByReportId(reportId);
    const caseDetails = detailDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<WithId<MoldReportDetails>>;

    for (let i = caseDetails.length - 1; i >= 0; i--) {
      const entry = caseDetails[i];
      const cover = Array.isArray(entry?.cover_photo) ? entry.cover_photo : [];
      const first = cover.find((url) => typeof url === "string" && url.trim().length > 0);
      if (first) return first;
    }
  } catch (error) {
    devLog(error, "GET_RAW_CASE_COVER_PHOTO");
  }
  return null;
};

// Helper: convert date_observed Timestamp to ISO string for client responses
const normalizeDateObserved = <T>(obj: T): T => {
  if (!obj || typeof obj !== "object") return obj;
  return normalizeResponseTimestamps(obj);
};

export const addMoldReportToFirestore = async (
  details: MoldReport
): Promise<(MoldReport & {_caseDetailIds?: string[]}) | null> => {
  try {
    // Auto-generate case_name if not provided
    let caseName = details.case_name;
    if (!caseName || caseName.trim() === "") {
      caseName = await generateNextDailyCaseName();
      devLog(`addMoldReportToFirestore: Auto-generated case_name="${caseName}"`);
    } else {
      devLog(`addMoldReportToFirestore: Creating report with case_name="${caseName}"`);
    }

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
      case_name: caseName, // Use the auto-generated or provided case_name
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
    const caseDetailIds: string[] = [];

    // Write each case_detail to the subcollection and collect IDs
    if (caseDetailsArray.length > 0) {
      const detailDocs = await Promise.all(
        caseDetailsArray.map((d) => addCaseDetailToSubcollection(reportId, d))
      );
      detailDocs.forEach((detailDoc) => {
        if (detailDoc && detailDoc.id) {
          caseDetailIds.push(detailDoc.id);
        }
      });
      devLog(`addMoldReportToFirestore: ✅ ${caseDetailsArray.length} case details written to subcollection with IDs: ${caseDetailIds.join(", ")}`);
    }

    // Invalidate report list caches that can reflect the new document.
    await invalidateAllLists("mold-reports-search");
    await invalidateAllLists("mold-reports-all");
    await invalidateAllLists("mold-reports-user");
    await invalidateAllLists("mold-reports-unassigned");
    if (details.assigned_mycologist_id) {
      await invalidateAllLists("mold-reports-assigned");
    }

    // Return with case_details included in response for backward compat
    const result = documentToJson<MoldReport>(doc);
    result.case_details = caseDetailsArray;
    (result as any)._caseDetailIds = caseDetailIds;
    return normalizeResponseTimestamps(result);
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
  // Convert old boolean parameter to new statusFilter parameter
  // isArchived=true means closed/archived, isArchived=false means open
  const statusFilter: "all" | "open" | "closed" | "rejected" = isArchived ? "closed" : "all";
  return retrieveAllMoldReportsByStatusFilter(limit, statusFilter, token);
};

export const retrieveAllMoldReportsByStatusFilter = async (
  limit: number,
  statusFilter: "all" | "open" | "closed" | "rejected" = "all",
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      statusFilter,
      limit,
      token: token || null,
    };

    // Try to get from cache
    const cached = await getCachedList<PaginatedResult<MoldReport[]>>("mold-reports-all", cacheQuery, {useCache: true});
    if (cached) {
      devLog(`[CACHE] Hit all reports for statusFilter=${statusFilter}, limit=${limit}`);
      return cached;
    }

    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllMoldReports(limit, token, statusFilter);
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);

    // Batch-fetch all Auth users and mold cases upfront
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

        // Embed mold_case priority at top level
        const moldCase = moldCasesMap.get(nr.id);
        if (moldCase) {
          nr.priority = moldCase.priority;
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
    await cacheList("mold-reports-all", response, cacheQuery, {ttl: MOLD_REPORT_SERVICE_TTL_SECONDS});

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

    // Batch-fetch reporter info and mold cases to enrich list response
    const uniqueUserIds = [...new Set(raw.map((r) => r.user_id).filter(Boolean))];
    const reportIds = raw.map((r: any) => r.id).filter(Boolean);

    const [authUsersMap, moldCasesMap] = await Promise.all([
      getAuthUsersByIds(uniqueUserIds),
      batchRetrieveMoldCasesByReportIds(reportIds),
    ]);

    const enriched = raw.map((r) => {
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

      // Embed mold_case priority at top level if available
      const moldCase = moldCasesMap.get(nr.id);
      if (moldCase) {
        nr.priority = moldCase.priority;
      }

      // case_details now live in subcollection — omit from list responses
      delete nr.case_details;

      return nr as Omit<MoldReport, "user_id">;
    });

    const response = {
      snapshot: enriched,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-user", response, cacheQuery, {ttl: MOLD_REPORT_SERVICE_TTL_SECONDS});

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

    const nr = normalizeDateObserved(raw) as unknown as MoldReport & any;
    const authUserPromise = nr.user_id ?
      getAuthUserById(nr.user_id).catch((error) => {
        devLog(error, "ENRICH_REPORT_USER");
        return null;
      }) :
      Promise.resolve(null);

    const detailDocsPromise = findAllCaseDetailsByReportId(id).catch((error) => {
      devLog(error, "ENRICH_REPORT_DETAILS");
      return [];
    });

    const moldCasePromise = retrieveMoldCaseByReportId(id).catch((error) => {
      devLog(error, "ENRICH_REPORT_PRIORITY");
      return null;
    });

    const [authUser, detailDocs, moldCase] = await Promise.all([
      authUserPromise,
      detailDocsPromise,
      moldCasePromise,
    ]);

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

    // Fetch case_details from subcollection instead of embedded field
    const caseDetails = detailDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<WithId<MoldReportDetails>>;

    // Transform cover photos to signed URLs
    if (caseDetails.length > 0) {
      devLog(`retrieveMoldReportById: Transforming ${caseDetails.length} case detail(s)`);
      nr.case_details = await transformCoverPhotos(caseDetails);
    } else {
      nr.case_details = [];
    }

    // Embed mold_case priority so clients have it on the detail view too
    if (moldCase?.priority) {
      nr.priority = moldCase.priority;
    }

    devLog("retrieveMoldReportById: ✅ Report retrieved successfully");
    return normalizeResponseTimestamps(nr);
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

    // Batch-fetch only reporter names + mold cases to enrich list response (no N+1)
    const uniqueUserIds = [...new Set(raw.map((r) => r.user_id).filter(Boolean))];
    const nameMap = await getAuthUserNamesByIds(uniqueUserIds);

    const enriched = raw.map((r) => {
      const nr = normalizeDateObserved(r) as unknown as MoldReport & any;

      const name = nameMap.get(nr.user_id);
      if (name) {
        nr.reporter = {
          name,
        };
      }

      // case_details now live in subcollection — omit from list responses
      delete nr.case_details;

      // Remove user identifier from unassigned list responses (only expose name)
      delete nr.user_id;

      return nr as MoldReport;
    });

    const response = {
      snapshot: enriched,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-unassigned", response, cacheQuery, {ttl: MOLD_REPORT_SERVICE_TTL_SECONDS});

    return response;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAssignedMoldReports = async (
  mycologistId: string,
  limit: number,
  token?: string,
  includeHistory = false,
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    // Build cache key (INCLUDE token for pagination)
    const cacheQuery = {
      mycologistId,
      includeHistory,
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
      await findReportsByAssignedMycologist(
        mycologistId,
        limit,
        includeHistory,
        token,
      );
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);

    // Batch-fetch all Auth users and mold cases upfront
    const uniqueUserIds = [...new Set(raw.map((r) => r.user_id).filter(Boolean))];
    const reportIds = raw.map((r: any) => r.id).filter(Boolean);

    const [authUsersMap, moldCasesMap] = await Promise.all([
      getAuthUsersByIds(uniqueUserIds),
      batchRetrieveMoldCasesByReportIds(reportIds),
    ]);

    // Enrich each report using pre-fetched data (no additional DB calls)
    const enriched = raw.map((r) => {
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

      // Embed mold_case priority at top level
      const moldCase = moldCasesMap.get(nr.id);
      if (moldCase) {
        nr.priority = moldCase.priority;
      }

      // case_details now live in subcollection — omit from list responses
      delete nr.case_details;

      return nr as MoldReport;
    });

    const response = {
      snapshot: enriched,
      nextPageToken: docs.nextPageToken,
    };

    // Cache the results
    await cacheList("mold-reports-assigned", response, cacheQuery, {ttl: MOLD_REPORT_SERVICE_TTL_SECONDS});

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

    return normalizeResponseTimestamps({
      id: doc.id,
      ...doc.data() as MoldReportDetails,
    });
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateCaseDetailInReport = async (
  reportId: string,
  detailId: string,
  updates: Partial<MoldReportDetails>
): Promise<MoldReportDetails | null> => {
  try {
    const result = await updateCaseDetailRepo(reportId, detailId, updates);
    if (!result) throw new Error("Failed to update case detail.");

    return updates as MoldReportDetails;
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
    if (!result) throw new Error("Failed to close mold report");

    // Invalidate all report caches since report status was closed
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
  rejected: number;
} | null> => {
  try {
    const mapping: Record<string, string[]> = {
      pending: ["pending"],
      in_progress: ["in progress"],
      resolved: ["resolved"],
      rejected: ["rejected"],
    };

    // Parallelize all independent count queries.
    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
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
      rejected: rejected ?? 0,
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

// @deprecated
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

    // Batch-fetch all Auth users and mold cases upfront
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

        // Embed mold_case priority at top level
        const moldCase = moldCasesMap.get(nr.id);
        if (moldCase) {
          nr.priority = moldCase.priority;
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
    await cacheList("mold-reports-search", response, cacheQuery, {ttl: MOLD_REPORT_SERVICE_TTL_SECONDS});

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
        month: startDate.toLocaleString("en-US", {month: "long", year: "numeric"}),
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
