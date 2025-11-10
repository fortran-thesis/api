import {
  DocumentSnapshot,
  FieldPath,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMonitoredMold,
  deleteMonitoredMold,
  findAllMonitoredMolds,
  findMonitoredMoldById,
  softDeleteMonitoredMold,
  updateMonitoredMold,
} from "../repositories/monitoredMoldRepository";
import {MonitoredMold, PaginatedResult, WithMetadata} from "../types/types";
import {transformImageUrl, transformImageUrls} from "../utils/storageTransform";

export const addMonitoredMoldToFirestore = async (
  details: MonitoredMold
): Promise<MonitoredMold | null> => {
  try {
    const detailsWithMetadata: WithMetadata<MonitoredMold> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const mold: DocumentSnapshot | null =
      await addMonitoredMold(detailsWithMetadata);
    if (!mold) throw new Error("Cannot add monitored mold.");
    return documentToJson<MonitoredMold>(mold);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMonitoredMolds = async (
  id: string,
  limit: number,
  token?: string
): Promise<PaginatedResult<MonitoredMold[]> | null> => {
  try {
    const queryModifier = (q: FirebaseFirestore.Query) =>
      q.where("folder_id", "==", id);

    const molds: PaginatedResult<QuerySnapshot> | null =
      await findAllMonitoredMolds(
        limit,
        token,
        ["metadata.created_at", "user_id", FieldPath.documentId()],
        {queryModifier}
      );
    if (!molds) throw new Error("No monitored molds found.");
    const items = queryToJson<MonitoredMold>(molds.snapshot);
    
    // Transform file paths to signed URLs
    const itemsWithSignedUrls = await transformImageUrls(items);
    
    return {
      snapshot: itemsWithSignedUrls,
      nextPageToken: molds.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMonitoredMoldById = async (
  id: string
): Promise<MonitoredMold | null> => {
  try {
    const mold: DocumentSnapshot | null = await findMonitoredMoldById(id);
    if (!mold) throw new Error("No monitored mold found.");
    const molds = documentToJson<MonitoredMold>(mold);
    
    // Transform file path to signed URL
    return await transformImageUrl(molds);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMonitoredMoldInFirestore = async (
  id: string,
  details: Partial<MonitoredMold>
): Promise<MonitoredMold | null> => {
  try {
    const result: WriteResult | null = await updateMonitoredMold(id, details);
    if (!result) throw new Error("Failed to update monitored mold.");
    const updatedMold = await retrieveMonitoredMoldById(id);
    return updatedMold;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMonitoredMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMonitoredMold(id);
    if (!result) throw new Error("Failed to soft delete monitored mold");
  } catch (error) {
    devLog(error);
  }
};

export const removeMonitoredMold = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMonitoredMold(id);
    if (!result) throw new Error("Failed to delete monitored mold");
  } catch (error) {
    devLog(error);
  }
};
