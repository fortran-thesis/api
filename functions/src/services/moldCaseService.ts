import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMoldCase,
  deleteMoldCase,
  findAllMoldCases,
  findAssignedMoldCases,
  findMoldCaseById,
  findMoldCaseByName,
  findMoldCaseByReportId,
  softDeleteMoldCase,
  updateMoldCase as updateMoldCaseRepo,
  appendCultivationLog,
  updateCultivationDetails,
} from "../repositories/moldCaseRepository";
import {MoldCase, PaginatedResult, WithMetadata} from "../types/types";

export const addMoldCaseToFirestore = async (
  details: MoldCase
): Promise<MoldCase | null> => {
  try {
    // convert start_date/end_date (strings from DTO) to Firestore Timestamp
    const rawStart = (details as any).start_date;
    const rawEnd = (details as any).end_date;
    const parsedStart = typeof rawStart === "string" ? new Date(rawStart) : rawStart;
    const parsedEnd = typeof rawEnd === "string" ? new Date(rawEnd) : rawEnd;
    const startTimestamp = parsedStart instanceof Date && !isNaN(parsedStart.getTime()) ? Timestamp.fromDate(parsedStart) : parsedStart;
    const endTimestamp = parsedEnd instanceof Date && !isNaN(parsedEnd.getTime()) ? Timestamp.fromDate(parsedEnd) : parsedEnd;

    const detailsWithMetadata: WithMetadata<MoldCase> = {
      ...details,
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
    const cases: PaginatedResult<QuerySnapshot> | null = await findAllMoldCases(
      uid,
      limit,
      isArchived,
      token
    );
    if (!cases) throw new Error("No cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => {
      const copy: any = { ...c };
      try {
        if (copy.start_date && typeof copy.start_date === "object" && (copy.start_date as any).toDate instanceof Function) {
          copy.start_date = (copy.start_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (copy.end_date && typeof copy.end_date === "object" && (copy.end_date as any).toDate instanceof Function) {
          copy.end_date = (copy.end_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      return copy as MoldCase;
    });

    return {
      snapshot: normalized,
      nextPageToken: cases.nextPageToken,
    };
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
    const cases: PaginatedResult<QuerySnapshot> | null = await findAssignedMoldCases(
      mycologistId,
      limit,
      token
    );
    if (!cases) throw new Error("No assigned cases found.");
    const raw = queryToJson<MoldCase>(cases.snapshot);
    const normalized = raw.map((c) => {
      const copy: any = { ...c };
      try {
        if (copy.start_date && typeof copy.start_date === "object" && (copy.start_date as any).toDate instanceof Function) {
          copy.start_date = (copy.start_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (copy.end_date && typeof copy.end_date === "object" && (copy.end_date as any).toDate instanceof Function) {
          copy.end_date = (copy.end_date as any).toDate().toISOString();
        }
      } catch (e) {
        /* ignore */
      }
      return copy as MoldCase;
    });

    return {
      snapshot: normalized,
      nextPageToken: cases.nextPageToken,
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
    const copy: any = { ...cases };
    try {
      if (copy.start_date && typeof copy.start_date === "object" && (copy.start_date as any).toDate instanceof Function) {
        copy.start_date = (copy.start_date as any).toDate().toISOString();
      }
    } catch (e) {
      /* ignore */
    }
    try {
      if (copy.end_date && typeof copy.end_date === "object" && (copy.end_date as any).toDate instanceof Function) {
        copy.end_date = (copy.end_date as any).toDate().toISOString();
      }
    } catch (e) {
      /* ignore */
    }
    return copy as MoldCase;
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
  reportId: string
): Promise<MoldCase | null> => {
  try {
    const moldCaseSnap: QuerySnapshot | null = await findMoldCaseByReportId(reportId);
    if (!moldCaseSnap) throw new Error("No case found for this report.");
    const cases = queryToJson<MoldCase>(moldCaseSnap);
    if (cases.length === 0) return null;
    // normalize dates
    const raw = cases[0];
    const normalized: any = { ...raw };
    if (raw.start_date && typeof (raw.start_date as any).toDate === "function") {
      normalized.start_date = (raw.start_date as any).toDate().toISOString();
    }
    if (raw.end_date && typeof (raw.end_date as any).toDate === "function") {
      normalized.end_date = (raw.end_date as any).toDate().toISOString();
    }
    return normalized as MoldCase;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldCaseInFirestore = async (
  id: string,
  details: Partial<MoldCase>
): Promise<MoldCase | null> => {
  try {
    // convert start_date/end_date strings to Timestamps if present
    const updatedDetails: any = { ...details };
    if (updatedDetails.start_date) {
      const raw = updatedDetails.start_date;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.start_date = parsed instanceof Date && !isNaN(parsed.getTime()) ? Timestamp.fromDate(parsed) : updatedDetails.start_date;
    }
    if (updatedDetails.end_date) {
      const raw = updatedDetails.end_date;
      const parsed = typeof raw === "string" ? new Date(raw) : raw;
      updatedDetails.end_date = parsed instanceof Date && !isNaN(parsed.getTime()) ? Timestamp.fromDate(parsed) : updatedDetails.end_date;
    }

    // Handle cultivation_details if it's provided as a nested object
    // Convert it to use dot notation for proper nesting in Firestore
    if (updatedDetails.cultivation_details !== undefined) {
      const cultivationDetails = updatedDetails.cultivation_details;
      delete updatedDetails.cultivation_details; // Remove the nested object
      
      // Add each field with dot notation
      if (cultivationDetails.growth_medium !== undefined) {
        updatedDetails["cultivation_details.growth_medium"] = cultivationDetails.growth_medium;
      }
      if (cultivationDetails.in_vivo_details !== undefined) {
        updatedDetails["cultivation_details.in_vivo_details"] = cultivationDetails.in_vivo_details;
      }
      if (cultivationDetails.in_vitro_details !== undefined) {
        updatedDetails["cultivation_details.in_vitro_details"] = cultivationDetails.in_vitro_details;
      }
    }

    const result: WriteResult | null = await updateMoldCaseRepo(id, updatedDetails);
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

export const addCultivationLogToCase = async (
  caseId: string,
  log: any
): Promise<MoldCase | null> => {
  try {
    const result = await appendCultivationLog(caseId, log);
    if (!result) throw new Error("Failed to add cultivation log");
    // Fetch and return updated case
    const updated = await retrieveMoldCaseById(caseId);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateCultivationDetailsInCase = async (
  caseId: string,
  details: { in_vivo_details?: any; in_vitro_details?: any }
): Promise<MoldCase | null> => {
  try {
    const result = await updateCultivationDetails(caseId, details);
    if (!result) throw new Error("Failed to update cultivation details");
    // Fetch and return updated case
    const updated = await retrieveMoldCaseById(caseId);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};
