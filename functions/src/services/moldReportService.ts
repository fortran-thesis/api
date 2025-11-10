import {DocumentSnapshot, QuerySnapshot, Timestamp, WriteResult} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
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
} from "../repositories/moldReportRepository";
import {APIUser, MoldReport, MoldReportDetails, PaginatedResult, WithId, WithMetadata} from "../types/types";
import { getAuthUserById } from "../lib/auth";
import { retrieveMoldCaseByReportId } from "./moldCaseService";

// Helper: convert date_observed Timestamp to ISO string for client responses
const normalizeDateObserved = <T extends any>(obj: T): T => {
  if (!obj || typeof obj !== "object") return obj;
  const copy: any = { ...obj };
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
    // Ensure case_details is treated as an array and attach metadata to each entry
    const caseDetailsArray = Array.isArray(details.case_details)
      ? details.case_details
      : [];

    const caseDetailsWithMeta: WithMetadata<MoldReportDetails>[] = caseDetailsArray.map(
      (d) => ({
        ...d,
        metadata: {
          created_at: Timestamp.now(),
          updated_at: null,
          deleted_at: null,
        },
      })
    );

    // convert date_observed (string from DTO) to Firestore Timestamp
    const rawDate = details.date_observed;
    const parsedDate = typeof rawDate === "string" ? new Date(rawDate) : rawDate;
    const dateObservedTimestamp = parsedDate instanceof Date && !isNaN(parsedDate.getTime()) ? Timestamp.fromDate(parsedDate) : Timestamp.now();

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
    const doc: DocumentSnapshot | null = await addMoldReport(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add mold report.");
    return documentToJson<MoldReport>(doc);
  } catch (error) {
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
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllMoldReports(
      limit,
      token
    );
    if (!docs) throw new Error("No mold reports found.");
    console.log('[DEBUG] retrieveAllMoldReports - raw snapshot size:', docs.snapshot.size);
    const raw = queryToJson<MoldReport>(docs.snapshot);
    console.log('[DEBUG] retrieveAllMoldReports - parsed count:', raw.length);
    console.log('[DEBUG] retrieveAllMoldReports - report IDs:', raw.map(r => r.id));
    // Normalize date_observed and enrich each report with reporter info in parallel
    const enriched = await Promise.all(
      raw.map(async (r) => {
        const nr = normalizeDateObserved(r) as unknown as MoldReport & any;
        try {
          const authUser = await getAuthUserById(nr.user_id);
          if (authUser) {
            nr.reporter = {
              id: authUser.id,
              name: authUser.details.displayName || authUser.user.first_name + ' ' + authUser.user.last_name,
            }
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_USER");
        }
        // Enrich with mold case if available
        try {
          const moldCase = await retrieveMoldCaseByReportId(nr.id);
          if (moldCase) {
            nr.mold_case = {
              priority: moldCase.priority
            } ;
          }
        } catch (e) {
          devLog(e, "ENRICH_REPORT_CASE");
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
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllMoldReportsByUser(
      uid,
      limit,
      isArchived,
      token
    );
    if (!docs) throw new Error("No mold reports found.");
    const raw = queryToJson<MoldReport>(docs.snapshot);
    // Remove user_id from each report
    const sanitized = raw.map(({ user_id, ...rest }) => rest) as Omit<MoldReport, "user_id">[];
    return {
      snapshot: sanitized,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldReportById = async (id: string): Promise<MoldReport | null> => {
  try {
    const doc: DocumentSnapshot | null = await findMoldReportById(id);
    if (!doc) throw new Error("No mold report found.");
    const raw = documentToJson<MoldReport>(doc);
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
    return nr;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveUnassignedMoldReports = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findUnassignedMoldReports(
      limit,
      token
    );
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
    const docs: PaginatedResult<QuerySnapshot> | null = await findReportsByAssignedMycologist(
      mycologistId,
      limit,
      token
    );
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
    const updatedDetails: any = { ...details };
    if (updatedDetails.date_observed) {
      const raw = updatedDetails.date_observed;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.date_observed = parsed instanceof Date && !isNaN(parsed.getTime()) ? Timestamp.fromDate(parsed) : updatedDetails.date_observed;
    }

    const result: WriteResult | null = await updateMoldReportRepo(id, updatedDetails);
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

export const getMoldReportStatusCounts = async (): Promise<{ total: number; pending: number; in_progress: number; resolved: number, closed: number } | null> => {
  try {
    // Map current canonical status keys to arrays that include legacy/alternate values.
    // Assumption: older documents might have used variants like 'in_progress' or 'assigned'.
    const mapping: Record<string, string[]> = {
      pending: ["pending"],
      in_progress: ["in progress", "in_progress", "assigned"],
      resolved: ["resolved", "done"],
      rejected: ["closed", "rejected"]
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
      closed: closed ?? 0
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const getAssignedReportsCount = async (mycologistId: string): Promise<number | null> => {
  try {
    const count = await countReportsByAssignedMycologist(mycologistId);
    return typeof count === "number" ? count : 0;
  } catch (error) {
    devLog(error);
    return null;
  }
};
