import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addScannedMold,
  deleteScannedMold,
  findAllScannedMolds,
  findScannedMoldById,
  softDeleteScannedMold,
  updateScannedMold,
} from "../repositories/scannedMoldRepository";

import {
  ScannedMold,
  WithMetadata,
  WithId,
  PaginatedResult,
} from "../types/types";
import {transformImageUrl, transformImageUrls} from "../utils/storageTransform";

export const addScannedMoldToFirestore = async (
  details: Omit<ScannedMold, "image_url">,
  imageUrl: string
): Promise<WithId<ScannedMold> | null> => {
  try {
    const detailsWithMeta: WithMetadata<ScannedMold> = {
      ...details,
      image_url: imageUrl,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null = await addScannedMold(detailsWithMeta);
    if (!doc) throw new Error("Cannot add scanned mold.");
    return documentToJson<WithId<ScannedMold>>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllScannedMolds = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<WithMetadata<ScannedMold>[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllScannedMolds(limit, token);
    if (!docs) throw new Error("No scanned molds found.");
    const items = queryToJson<WithMetadata<ScannedMold>>(docs.snapshot);

    // Transform file paths to signed URLs
    const itemsWithSignedUrls = await transformImageUrls(items);

    return {
      snapshot: itemsWithSignedUrls,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveScannedMoldById = async (
  id: string
): Promise<WithMetadata<ScannedMold> | null> => {
  try {
    const doc: DocumentSnapshot | null = await findScannedMoldById(id);
    if (!doc) throw new Error("No scanned mold found.");
    const mold = documentToJson<WithMetadata<ScannedMold>>(doc);

    // Transform file path to signed URL
    return await transformImageUrl(mold);
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
