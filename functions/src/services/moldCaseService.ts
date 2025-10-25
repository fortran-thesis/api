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
  findMoldCaseById,
  findMoldCaseByName,
  softDeleteMoldCase,
  updateMoldCase as updateMoldCaseRepo,
} from "../repositories/moldCaseRepository";
import {MoldCase, PaginatedResult, WithMetadata} from "../types/types";

export const addMoldCaseToFirestore = async (
  details: MoldCase
): Promise<MoldCase | null> => {
  try {
    const detailsWithMetadata: WithMetadata<MoldCase> = {
      ...details,
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
    return {
      snapshot: queryToJson<MoldCase>(cases.snapshot),
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
    return cases;
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

export const updateMoldCaseInFirestore = async (
  id: string,
  details: Partial<MoldCase>
): Promise<MoldCase | null> => {
  try {
    const result: WriteResult | null = await updateMoldCaseRepo(id, details);
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
