import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addSystemRequest,
  deleteSystemRequest,
  findAllSystemRequests,
  findSystemRequestById,
  softDeleteSystemRequest,
  updateSystemRequest,
} from "../repositories/systemRequestRepository";
import { SystemRequest, WithMetadata, WithId } from "../types/types";

export const addSystemRequestToFirestore = async (
  details: SystemRequest
): Promise<WithId<SystemRequest> | null> => {
  try {
    const detailsWithTimestamp: WithMetadata<SystemRequest> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null = await addSystemRequest(detailsWithTimestamp);
    if (!doc) throw new Error("Cannot add system request.");
    return documentToJson<WithId<SystemRequest>>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllSystemRequests = async (
  limit: number,
  offset: number
): Promise<SystemRequest[] | null> => {
  try {
    const docs: QuerySnapshot | null = await findAllSystemRequests(limit, offset);
    if (!docs) throw new Error("No system requests found.");
    return queryToJson<SystemRequest>(docs);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveSystemRequestById = async (
  id: string
): Promise<SystemRequest | null> => {
  try {
    const doc: QuerySnapshot | null = await findSystemRequestById(id);
    if (!doc) throw new Error("System request not found.");
    return queryToJson<SystemRequest>(doc)[0];
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateSystemRequestInFirestore = async (
  id: string,
  details: Partial<SystemRequest>
): Promise<SystemRequest | null> => {
  try {
    const doc: WriteResult | null = await updateSystemRequest(id, details);
    if (!doc) throw new Error("Failed to update system request.");
    const updated = await retrieveSystemRequestById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const removeSystemRequest = async (id: string) => {
  try {
    await deleteSystemRequest(id);
  } catch (error) {
    devLog(error);
    throw error;
  }
};

export const softRemoveSystemRequest = async (id: string) => {
  try {
    await softDeleteSystemRequest(id);
  } catch (error) {
    devLog(error);
    throw error;
  }
};
