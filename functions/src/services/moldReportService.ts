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
} from "../repositories/moldReportRepository";
import {MoldReport, MoldReportDetails, PaginatedResult, WithMetadata} from "../types/types";

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

    const detailsWithMetadata: WithMetadata<MoldReport> = {
      ...details,
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

export const retrieveAllMoldReportsByUser = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<PaginatedResult<MoldReport[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllMoldReports(
      uid,
      limit,
      isArchived,
      token
    );
    if (!docs) throw new Error("No mold reports found.");
    return {
      snapshot: queryToJson<MoldReport>(docs.snapshot),
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
    return documentToJson<MoldReport>(doc);
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
    return {
      snapshot: queryToJson<MoldReport>(docs.snapshot),
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
    return {
      snapshot: queryToJson<MoldReport>(docs.snapshot),
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
    const result: WriteResult | null = await updateMoldReportRepo(id, details);
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
