import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import {
  addMoldToFirestore,
  removeMold,
  retrieveAllMolds,
  retrieveMoldById,
  retrieveMoldByName,
  softRemoveMold,
  updateMoldInFirestore,
} from "../services/moldService";
import { Mold } from "../types/types";
import { uploadFiles } from "../lib/storage";

export const createMold = async (req: Request, res: Response) => {
  try {
    const details: Omit<Mold, 'photo_url'> = req.body.details;
    const photos: Express.Multer.File[] = req.files as Express.Multer.File[]
    const urls = await uploadFiles(photos, details.name)
    const mold: Mold | null = await addMoldToFirestore({...details, photo_url: urls});
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMolds = async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const offset: number = (page - 1) * limit;
  try {
    const molds: Mold[] | null = await retrieveAllMolds(limit, offset);
    if (!molds) return sendError(res, "Failed to retrieve molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: Mold | null = await retrieveMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldByName = async (req: Request, res: Response) => {
  try {
    const name: string = req.params.name;
    const mold: Mold | null = await retrieveMoldByName(name);
    if (!mold) return sendError(res, "Failed to retrieve mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Mold = req.body.details;
    const mold = await updateMoldInFirestore(id, details);
    if (!mold) return sendError(res, "Failed to update mold", 404);
    return sendSuccess(res, "Successfully updated mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMold(id);
    return sendSuccess(res, "Successfully deleted mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMold(id);
    return sendSuccess(res, "Successfully soft deleted mold.")
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
}