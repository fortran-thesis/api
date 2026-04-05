import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {Moldipedia, MoldipediaResponse, PaginatedResult, WithId} from "../types/types";
import {uploadFile} from "../lib/storage";
import {StorageFolder, generateStoragePath} from "../configs/storage";
import {
  addMoldipediaToFirestore,
  retrieveAllMoldipedia,
  retrieveMoldipediaById,
  updateMoldipediaInFirestore,
  removeMoldipedia,
  softRemoveMoldipedia,
  archiveMoldipedia,
  unarchiveMoldipedia,
  retrieveArchivedMoldipedia,
} from "../services/moldipediaService";

export const createMoldipedia = async (req: Request, res: Response) => {
  try {
    const rawDetails = req.body.details;
    // After parseMultipartJson middleware, "details" is promoted to root body;
    // fall back to flat req.body so both form-data and JSON work.
    const details: Omit<Moldipedia, "cover_photo"> =
      typeof rawDetails === "string" ? JSON.parse(rawDetails) : (rawDetails ?? req.body);
    // Auto-populate author_id from the authenticated user if not provided
    const authorId = details.author_id || req.user?.id || "";
    const photo: Express.Multer.File = req.file as Express.Multer.File;
    if (!photo) {
      return sendError(res, "Cover photo is required.", 400);
    }
    const filePath = generateStoragePath(
      StorageFolder.MOLDIPEDIA,
      photo.originalname
    );
    const url = await uploadFile(filePath, photo.buffer, photo.mimetype);
    if (!url) {
      return sendError(
        res,
        "Invalid cover photo, please upload a different image.",
        400
      );
    }
    const article: WithId<Moldipedia> | null = await addMoldipediaToFirestore({
      ...details,
      author_id: authorId,
      cover_photo: url,
      is_archived: false,
    });
    if (!article) {
      return sendError(res, "Failed to create moldipedia article", 400);
    }
    req.auditTargetId = article["id"] || "";
    return sendSuccess(res, article);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMoldipedia = async (req: Request, res: Response) => {
  const searchQuery: string | undefined = req.query.search as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as
    | string
    | undefined;
  try {
    const result: PaginatedResult<MoldipediaResponse[]> | null =
      await retrieveAllMoldipedia(limit, pageToken, searchQuery);
    if (!result) {
      return sendError(res, "Failed to retrieve moldipedia articles", 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getMoldipediaById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const article: MoldipediaResponse | null = await retrieveMoldipediaById(id);
    if (!article) {
      return sendError(res, "Failed to retrieve moldipedia article", 404);
    }
    return sendSuccess(res, article);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchMoldipedia = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    // Support both { details: {...} } and flat body formats (after parseMultipartJson, fields are at root)
    const details: Partial<Moldipedia> = req.body.details ?? req.body;

    // Upload new cover photo if provided via multipart/form-data
    const photo = req.file as Express.Multer.File | undefined;
    let coverPhotoUrl: string | undefined;
    if (photo) {
      const filePath = generateStoragePath(StorageFolder.MOLDIPEDIA, photo.originalname);
      coverPhotoUrl = (await uploadFile(filePath, photo.buffer, photo.mimetype)) || undefined;
      if (!coverPhotoUrl) {
        return sendError(res, "Invalid cover photo, please upload a different image.", 400);
      }
    }

    const updateData: Partial<Moldipedia> = {
      ...details,
      ...(coverPhotoUrl && {cover_photo: coverPhotoUrl}),
    };

    const updated = await updateMoldipediaInFirestore(id, updateData);
    if (!updated) {
      return sendError(res, "Failed to update moldipedia article", 404);
    }
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteMoldipedia = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeMoldipedia(id);
    return sendSuccess(res, "Successfully deleted moldipedia article");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteMoldipedia = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveMoldipedia(id);
    return sendSuccess(res, "Successfully soft deleted moldipedia article.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

// ─── Archive / Unarchive ─────────────────────────────────────────────────────────

export const getAllArchivedMoldipedia = async (req: Request, res: Response) => {
  try {
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as string | undefined;
    const result = await retrieveArchivedMoldipedia(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve archived moldipedia articles", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const archiveMoldipediaArticle = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const updated = await archiveMoldipedia(id);
    if (!updated) return sendError(res, "Failed to archive moldipedia article", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const unarchiveMoldipediaArticle = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const updated = await unarchiveMoldipedia(id);
    if (!updated) return sendError(res, "Failed to unarchive moldipedia article", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};
