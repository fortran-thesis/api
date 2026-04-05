import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {PaginatedResult, SystemRequest, WithId} from "../types/types";
import {
  addSystemRequestToFirestore,
  retrieveAllSystemRequests,
  retrieveSystemRequestById,
  updateSystemRequestInFirestore,
  removeSystemRequest,
  softRemoveSystemRequest,
} from "../services/systemRequestService";

export const createSystemRequest = async (req: Request, res: Response) => {
  try {
    const details: Omit<SystemRequest, "created_at"> = req.body;
    const request: WithId<SystemRequest> | null = await addSystemRequestToFirestore(details as SystemRequest);
    if (!request) return sendError(res, "Failed to create system request", 400);
    return sendSuccess(res, request);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllSystemRequests = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const requests: PaginatedResult<SystemRequest[]> | null = await retrieveAllSystemRequests(limit, pageToken);
    if (!requests) return sendError(res, "Failed to retrieve system requests", 404);
    return sendSuccess(res, requests);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getSystemRequestById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const request: SystemRequest | null = await retrieveSystemRequestById(id);
    if (!request) return sendError(res, "Failed to retrieve system request", 404);
    return sendSuccess(res, request);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const patchSystemRequest = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: Partial<SystemRequest> = req.body;
    const updated = await updateSystemRequestInFirestore(id, details);
    if (!updated) return sendError(res, "Failed to update system request", 404);
    return sendSuccess(res, updated);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const deleteSystemRequest = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeSystemRequest(id);
    return sendSuccess(res, "Successfully deleted system request");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const softDeleteSystemRequest = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await softRemoveSystemRequest(id);
    return sendSuccess(res, "Successfully soft deleted system request.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


