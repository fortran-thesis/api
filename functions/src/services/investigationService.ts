import {DocumentSnapshot, WriteResult, Timestamp} from "firebase-admin/firestore";
import {documentToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addInvestigation,
  deleteInvestigation,
  findInvestigationById,
  softDeleteInvestigation,
  updateInvestigation as updateInvestigationRepo,
} from "../repositories/investigationRepository";
import {Investigation, WithMetadata} from "../types/types";

export const addInvestigationToFirestore = async (
  details: Investigation
): Promise<Investigation | null> => {
  try {
    const detailsWithMetadata: WithMetadata<Investigation> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null = await addInvestigation(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add investigation.");
    return documentToJson<Investigation>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveInvestigationById = async (
  id: string
): Promise<Investigation | null> => {
  try {
    const doc: DocumentSnapshot | null = await findInvestigationById(id);
    if (!doc) throw new Error("No investigation found.");
    return documentToJson<Investigation>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateInvestigationInFirestore = async (
  id: string,
  details: Partial<Investigation>
): Promise<Investigation | null> => {
  try {
    const result: WriteResult | null = await updateInvestigationRepo(id, details);
    if (!result) throw new Error("Failed to update investigation.");
    const updated = await retrieveInvestigationById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveInvestigation = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteInvestigation(id);
    if (!result) throw new Error("Failed to soft delete investigation");
  } catch (error) {
    devLog(error);
  }
};

export const removeInvestigation = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteInvestigation(id);
    if (!result) throw new Error("Failed to delete investigation");
  } catch (error) {
    devLog(error);
  }
};
