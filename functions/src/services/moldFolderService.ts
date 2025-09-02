import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import { documentToJson, queryToJson } from "../lib/firestore";
import { devLog } from "../utils/dev";
import {
  addMoldFolder,
  deleteMoldFolder,
  findAllMoldFolders,
  findMoldFolderById,
  findMoldFolderByName,
  softDeleteMoldFolder,
  updateMoldFolder as updateMoldFolderRepo,
} from "../repositories/moldFolderRespository";
import { MoldFolder, PaginatedResult, WithMetadata } from "../types/types";

export const addMoldFolderToFirestore = async (
  details: MoldFolder
): Promise<MoldFolder | null> => {
  try {
    const detailsWithMetadata: WithMetadata<MoldFolder> = {
      ...details,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const folder: DocumentSnapshot | null =
      await addMoldFolder(detailsWithMetadata);
    if (!folder) throw new Error("Cannot add mold folder.");
    return documentToJson<MoldFolder>(folder);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldFoldersByUser = async (
  uid: string,
  limit: number,
  isArchived: boolean,
  token?: string
): Promise<PaginatedResult<MoldFolder[]> | null> => {
  try {
    const folders: PaginatedResult<QuerySnapshot> | null = await findAllMoldFolders(
      uid,
      limit,
      isArchived,
      token
    );
    if (!folders) throw new Error("No folders found.");
    return {snapshot: queryToJson<MoldFolder>(folders.snapshot), nextPageToken: folders.nextPageToken};
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldFolderById = async (
  id: string
): Promise<MoldFolder | null> => {
  try {
    const folder: DocumentSnapshot | null = await findMoldFolderById(id);
    if (!folder) throw new Error("No folder found.");
    const folders = documentToJson<MoldFolder>(folder);
    return folders
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldFolderByName = async (
  name: string
): Promise<MoldFolder | null> => {
  try {
    const folder: QuerySnapshot | null = await findMoldFolderByName(name);
    if (!folder) throw new Error("No folder found.");
    const folders = queryToJson<MoldFolder>(folder);
    return folders.length > 0 ? folders[0] : null;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldFolderInFirestore = async (
  id: string,
  details: Partial<MoldFolder>
): Promise<MoldFolder | null> => {
  try {
    const result: WriteResult | null = await updateMoldFolderRepo(id, details);
    if (!result) throw new Error("Failed to update mold folder.");
    const updatedFolder = await retrieveMoldFolderById(id);
    return updatedFolder;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldFolder = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMoldFolder(id);
    if (!result) throw new Error("Failed to soft delete mold folder");
  } catch (error) {
    devLog(error);
  }
};

export const removeMoldFolder = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldFolder(id);
    if (!result) throw new Error("Failed to delete mold folder");
  } catch (error) {
    devLog(error);
  }
};
