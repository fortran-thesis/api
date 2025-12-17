import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addFAQ,
  deleteFAQ,
  findAllFAQ,
  findFAQById,
  softDeleteFAQ,
  updateFAQ,
} from "../repositories/faqRepository";
import {
  FAQ,
  WithMetadata,
  WithId,
  PaginatedResult,
} from "../types/types";

export const addFAQToFirestore = async (
  details: FAQ
): Promise<WithId<FAQ> | null> => {
  try {
    const detailsWithMetadata: WithMetadata<FAQ> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addFAQ(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add FAQ.");
    return documentToJson<WithId<FAQ>>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllFAQ = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<FAQ[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null =
      await findAllFAQ(limit, token);
    if (!docs) throw new Error("No FAQ found.");
    return {
      snapshot: queryToJson<FAQ>(docs.snapshot),
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveFAQById = async (
  id: string
): Promise<FAQ | null> => {
  try {
    const doc: DocumentSnapshot | null = await findFAQById(id);
    if (!doc) throw new Error("FAQ not found.");
    return documentToJson<FAQ>(doc);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateFAQInFirestore = async (
  id: string,
  details: Partial<FAQ>
): Promise<FAQ | null> => {
  try {
    const result: WriteResult | null = await updateFAQ(id, details);
    if (!result) throw new Error("Failed to update FAQ.");
    return await retrieveFAQById(id);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const removeFAQ = async (id: string): Promise<boolean> => {
  try {
    const result: WriteResult | null = await deleteFAQ(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};

export const softRemoveFAQ = async (id: string): Promise<boolean> => {
  try {
    const result: WriteResult | null = await softDeleteFAQ(id);
    return !!result;
  } catch (error) {
    devLog(error);
    return false;
  }
};
