import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMoldipedia,
  deleteMoldipedia,
  findAllMoldipedia,
  findMoldipediaById,
  softDeleteMoldipedia,
  updateMoldipedia,
} from "../repositories/moldipediaRepository";
import {
  Moldipedia,
  WithMetadata,
  WithId,
  PaginatedResult,
} from "../types/types";

export const addMoldipediaToFirestore = async (
  details: Moldipedia
): Promise<WithId<Moldipedia> | null> => {
  try {
    const detailsWithMetadata: WithMetadata<Moldipedia> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addMoldipedia(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add moldipedia.");
    return documentToJson<WithId<Moldipedia>>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldipedia = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<Moldipedia[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllMoldipedia(
      limit,
      token
    );
    if (!docs) throw new Error("No moldipedia entries found.");
    return {
      snapshot: queryToJson<Moldipedia>(docs.snapshot),
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldipediaById = async (
  id: string
): Promise<Moldipedia | null> => {
  try {
    const query: DocumentSnapshot | null = await findMoldipediaById(id);
    if (!query) throw new Error("No moldipedia found.");
    return documentToJson<Moldipedia>(query);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldipediaInFirestore = async (
  id: string,
  details: Partial<Moldipedia>
): Promise<Moldipedia | null> => {
  try {
    const result: WriteResult | null = await updateMoldipedia(id, details);
    if (!result) throw new Error("Failed to update moldipedia.");
    const updated = await retrieveMoldipediaById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldipedia = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMoldipedia(id);
    if (!result) throw new Error("Failed to soft delete moldipedia");
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldipedia = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldipedia(id);
    if (!result) throw new Error("Failed to delete moldipedia");
  } catch (error) {
    devLog(error);
  }
};
