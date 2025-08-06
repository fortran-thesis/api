import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";

import { MoldFolder } from "../types/types";
import { uploadFile } from "../lib/storage";
import { addMoldFolderToFirestore, retrieveAllMoldFoldersByUser, updateMoldFolderInFirestore, removeMoldFolder, softRemoveMoldFolder } from "../services/moldFolderService";

export const createMoldFolder = async (req: Request, res: Response) => {
  try {
    const details: Omit<MoldFolder, 'photo_url' | 'is_archived'> = req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File
    const url = await uploadFile('mold_folders', photo.originalname, photo.buffer, photo.mimetype)
    if(!url) return sendError(res, 'Invalid photo, please upload a different image.', 400)
    const moldFolder: MoldFolder | null  = await addMoldFolderToFirestore({...details, photo_url: url, is_archived: false});
    if (!moldFolder) return sendError(res, "Failed to create mold folder", 400);
    return sendSuccess(res, 'Successfully created mold folder.');
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldFolders = async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const offset: number = (page - 1) * limit;
  const uid: string | undefined = req.user?.id
  try {
    if(!uid) return sendError(res, 'Unauthorized', 401)
    const molds: MoldFolder[] | null = await retrieveAllMoldFoldersByUser(uid, limit, offset, false);

    if (!molds) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllArchivedMoldFolders = async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const offset: number = (page - 1) * limit;
  const uid: string | undefined = req.user?.id
  try {
    if(!uid) return sendError(res, 'Unauthorized', 401)
    const molds: MoldFolder[] | null = await retrieveAllMoldFoldersByUser(uid, limit, offset, true);

    if (!molds) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMoldFolder = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<MoldFolder> = req.body.details;
    const updated = await updateMoldFolderInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update mold folder", 404);
    return sendSuccess(res, "Successfully updated mold folder.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldFolder = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMoldFolder(id);
    return sendSuccess(res, "Successfully deleted mold folder");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldFolder = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMoldFolder(id);
    return sendSuccess(res, "Successfully soft deleted mold folder.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


