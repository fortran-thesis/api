import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {MonitoredMold, PaginatedResult} from "../types/types";
import {
  addMonitoredMoldToFirestore,
  retrieveAllMonitoredMolds,
  retrieveMonitoredMoldById,
  updateMonitoredMoldInFirestore,
  removeMonitoredMold,
  softRemoveMonitoredMold,
} from "../services/monitoredMoldService";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";

export const createMonitoredMold = async (req: Request, res: Response) => {
  try {
    const details: MonitoredMold = req.body.details;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const filePath = generateStoragePath(StorageFolder.MONITORED_MOLDS, photo.originalname);
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    }
    const mold: MonitoredMold | null = await addMonitoredMoldToFirestore({
      ...details,
      image_url: url,
    });
    if (!mold) return sendError(res, "Failed to create monitored mold", 400);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMonitoredMoldsByFolderId = async (
  req: Request,
  res: Response
) => {
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const folderId: string = req.query.folderId as string;
  try {
    if (!folderId) {
      return sendError(res, "Folder ID is required", 400);
    }
    const molds: PaginatedResult<MonitoredMold[]> | null = await retrieveAllMonitoredMolds(
      folderId,
      limit,
      pageToken
    );
    if (!molds) {
      return sendError(res, "Failed to retrieve monitored molds", 404);
    }
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMonitoredMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: MonitoredMold | null = await retrieveMonitoredMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve monitored mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<MonitoredMold> = req.body.details;
    const updated = await updateMonitoredMoldInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update monitored mold", 404);
    return sendSuccess(res, "Successfully updated monitored mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMonitoredMold(id);
    return sendSuccess(res, "Successfully deleted monitored mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMonitoredMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMonitoredMold(id);
    return sendSuccess(res, "Successfully soft deleted monitored mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

