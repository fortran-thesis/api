import {Request, Response} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {PaginatedResult, ScannedMold, WithId} from "../types/types";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {ScannedMoldCreateSchema} from "../dto/scannedMoldDTO";
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
    const rawScannedResults = req.body.scanned_results;
    let scannedResults = rawScannedResults;
    if (typeof rawScannedResults === "string") {
      try {
        scannedResults = JSON.parse(rawScannedResults);
      } catch (_error) {
        return sendError(res, "scanned_results must be a valid JSON object.", 400);
      }
    }

    const parsed = ScannedMoldCreateSchema.safeParse({
      ...req.body,
      scanned_results: scannedResults,
    });
    if (!parsed.success) {
      const messages = parsed.error.errors.map((e) => e.message).join(", ");
      return sendError(res, messages, 400);
    }

    const authenticatedUserId = req.user?.id;
    const requestUserId = parsed.data.user_id;
    const userId = authenticatedUserId || requestUserId;
    if (!userId) {
      return sendError(res, "User ID is required.", 400);
    }

    const details: Omit<ScannedMold, "image_url"> = {
      user_id: userId,
      image_format: parsed.data.image_format,
      scan_modality: parsed.data.scan_modality,
      source_flow: parsed.data.source_flow,
      ...(parsed.data.source_tab ? {source_tab: parsed.data.source_tab} : {}),
      ...(parsed.data.mold_id ? {mold_id: parsed.data.mold_id} : {}),
      ...(parsed.data.predicted_class_name ? {predicted_class_name: parsed.data.predicted_class_name} : {}),
      ...(parsed.data.mold_case_id ? {mold_case_id: parsed.data.mold_case_id} : {}),
      ...(parsed.data.captured_at ? {captured_at: Timestamp.fromDate(new Date(parsed.data.captured_at))} : {}),
      scanned_results: parsed.data.scanned_results,
    };

    const photo: Express.Multer.File = req.file as Express.Multer.File;
    if (!photo) {
      return sendError(res, "Photo is required.", 400);
    }

    const filePath = generateStoragePath(StorageFolder.SCANNED_MOLDS, photo.originalname);
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid photo, please upload a different image.",
        400
      );
    }
    const scanned: WithId<ScannedMold> | null = await addScannedMoldToFirestore(
      details,
      url
    );
    if (!scanned) return sendError(res, "Failed to create scanned mold", 400);
    req.auditTargetId = scanned.id || "";
    return sendSuccess(res, scanned);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllScannedMolds = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  const moldCaseId = req.query.mold_case_id as string | undefined;
  const scanModality = req.query.scan_modality as "microscopic" | "macroscopic" | undefined;
  try {
    const molds: PaginatedResult<ScannedMold[]> | null = await retrieveAllScannedMolds(
      limit,
      pageToken,
      {
        mold_case_id: moldCaseId,
        scan_modality: scanModality,
      }
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

