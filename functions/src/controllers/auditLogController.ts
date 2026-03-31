import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {getAuditLogsByAction, getAllAuditLogs} from "../services/auditLogService";

export const getAuditLogs = async (req: Request, res: Response) => {
  const action: string | undefined = req.query.action as string | undefined;
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    if (action) {
      const logs = await getAuditLogsByAction(action);
      if (!logs) return sendError(res, "No audit logs found", 404);
      return sendSuccess(res, logs);
    } else {
      const logs = await getAllAuditLogs(limit, pageToken);
      if (!logs) return sendError(res, "No audit logs found", 404);
      return sendSuccess(res, logs);
    }
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


