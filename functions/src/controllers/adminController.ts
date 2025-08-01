import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { banUser, toggleUser } from "../services/adminService";

export const disableUser = async (req: Request, res: Response) => {
  try {
    const id = req.body.id;
    const email = req.body.email;
    const process = await toggleUser(id, email, true);
    if (!process.success) return sendError(res, "Failed to disable user.");
    return sendSuccess(res, 'Successfully disabled user.')
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const enableUser = async (req: Request, res: Response) => {
  try {
    const id = req.body.id;
    const email = req.body.id;
    const process = await toggleUser(id, email, false);
    if (!process.success) return sendError(res, "Failed to enable user.");
    return sendSuccess(res, 'Successfully enabled user.')
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const banUserController = async (req: Request, res: Response) => {
  try {
    const id = req.body.id;
    const email = req.body.id;
    const process = await banUser(id, email);
    if (!process.success) return sendError(res, "Failed to ban user.");
    return sendSuccess(res, 'Successfully banned user.')
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


