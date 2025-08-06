import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { MonitoredMold } from "../types/types";
import {
  addMonitoredMoldToFirestore,
  retrieveAllMonitoredMolds,
  retrieveMonitoredMoldById,
  updateMonitoredMoldInFirestore,
  removeMonitoredMold,
  softRemoveMonitoredMold
} from "../services/monitoredMoldService";

export const createMonitoredMold = async (req: Request, res: Response) => {
  try {
    const details: MonitoredMold = req.body.details;
    const mold: MonitoredMold | null = await addMonitoredMoldToFirestore(details);
    if (!mold) return sendError(res, "Failed to create monitored mold", 400);
    return sendSuccess(res, mold);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getAllMonitoredMolds = async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const offset: number = (page - 1) * limit;
  try {
    const molds: MonitoredMold[] | null = await retrieveAllMonitoredMolds(limit, offset);
    if (!molds) return sendError(res, "Failed to retrieve monitored molds", 404);
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
