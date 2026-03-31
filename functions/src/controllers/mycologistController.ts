import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {registerMycologist} from "../services/mycologistService";

export const registerMycologistController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await registerMycologist(req.body);
    if (!result) {
      return sendError(res, "Failed to register mycologist", 400);
    }
    return sendSuccess(res, {
      userId: result.userId,
      message: result.message,
    });
  } catch (error) {
    devLog(error, "REGISTER_MYCOLOGIST_CONTROLLER");
    return defaultError(res);
  }
};


