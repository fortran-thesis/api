import { Request, Response } from "express";
import { devLog } from "../utils/dev";
import { defaultError, sendError, sendSuccess } from "../utils/response";
import { getAuditLogsByAction, getAllAuditLogs } from "../services/auditLogService";

export const getAuditLogs = async (req: Request, res: Response) => {
/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [AuditLog]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve audit logs, optionally filtered by action. Requires authentication (Bearer token or session cookie).
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by audit action (e.g., ADD_MOLD, EDIT_MOLD, etc.)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 
 *              Page number (default: 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 
 *              Page size (default: 10)
 *     responses:
 *       200:
 *         description: List of audit logs
 *       404:
 *         description: No audit logs found
 *       500:
 *         description: Server error
 */
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
