import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addScannedMold,
  deleteScannedMold,
  findAllScannedMolds,
  findScannedMoldById,
  softDeleteScannedMold,
  updateScannedMold,
} from "../repositories/scannedMoldRepository";

import { ScannedMold, WithMetadata } from "../types/types";


export const addScannedMoldToFirestore = async (
  details: Omit<ScannedMold, "image_url">,
  image_url: string
): Promise<WithMetadata<ScannedMold> | null> => {
  try {
    const detailsWithMeta: WithMetadata<ScannedMold> = {
      ...details,
      image_url,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null
      }
    };
    const doc: DocumentSnapshot | null = await addScannedMold(detailsWithMeta);
    if (!doc) throw new Error("Cannot add scanned mold.");
    return documentToJson<WithMetadata<ScannedMold>>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};


export const retrieveAllScannedMolds = async (
  limit: number,
  offset: number
): Promise<WithMetadata<ScannedMold>[] | null> => {
  try {
    const docs: QuerySnapshot | null = await findAllScannedMolds(limit, offset);
    if (!docs) throw new Error("No scanned molds found.");
    return queryToJson<WithMetadata<ScannedMold>>(docs);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveScannedMoldById = async (id: string): Promise<WithMetadata<ScannedMold> | null> => {
  try {
    const doc: QuerySnapshot | null = await findScannedMoldById(id);
    if (!doc) throw new Error("No scanned mold found.");
    return queryToJson<WithMetadata<ScannedMold>>(doc)[0];
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateScannedMoldInFirestore = async (
  id: string,
  details: Partial<ScannedMold>
): Promise<WithMetadata<ScannedMold> | null> => {
  try {
    const result: WriteResult | null = await updateScannedMold(id, details);
    if (!result) throw new Error("Failed to update scanned mold.");
    const updated = await retrieveScannedMoldById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveScannedMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteScannedMold(id);
    if (!result) throw new Error("Failed to soft delete scanned mold");
  } catch (error) {
    devLog(error);
  }
};

export const removeScannedMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteScannedMold(id);
    if (!result) throw new Error("Failed to delete scanned mold");
  } catch (error) {
    devLog(error);
  }
};
