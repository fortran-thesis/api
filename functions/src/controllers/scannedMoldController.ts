import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { ScannedMold } from "../types/types";
import { uploadFile } from "../lib/storage";
import {
  addScannedMoldToFirestore,
  retrieveAllScannedMolds,
  retrieveScannedMoldById,
  updateScannedMoldInFirestore,
  removeScannedMold,
  softRemoveScannedMold,
} from "../services/scannedMoldService";

export const createScannedMold = async (req: Request, res: Response) => {
  try {
    const details: Omit<ScannedMold, "image_url" | "uploaded_at"> = req.body;
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    const url = await uploadFile(
      "scanned_molds",
      photo.originalname,
      photo.buffer,
      photo.mimetype
    );
    if (!url)
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    const scanned: ScannedMold | null = await addScannedMoldToFirestore(
      details,
      url
    );
    if (!scanned) return sendError(res, "Failed to create scanned mold", 400);
    return sendSuccess(res, scanned);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllScannedMolds = async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const offset: number = (page - 1) * limit;
  try {
    const molds: ScannedMold[] | null = await retrieveAllScannedMolds(
      limit,
      offset
    );
    if (!molds) return sendError(res, "Failed to retrieve scanned molds", 404);
    return sendSuccess(res, molds);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getScannedMoldById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const mold: ScannedMold | null = await retrieveScannedMoldById(id);
    if (!mold) return sendError(res, "Failed to retrieve scanned mold", 404);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<ScannedMold> = req.body;
    const updated = await updateScannedMoldInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update scanned mold", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeScannedMold(id);
    return sendSuccess(res, "Successfully deleted scanned mold");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteScannedMold = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveScannedMold(id);
    return sendSuccess(res, "Successfully soft deleted scanned mold.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
