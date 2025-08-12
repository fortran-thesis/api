import { Router, Request, Response } from "express";
import { verifyUser } from "../middlewares/verification";
import { getAuditLogs } from "../controllers/auditLogController";
import { Role } from "../types/enums";

const router = Router();

// Get audit logs, optionally filtered by action type

// Fixed endpoints for each audit action
const auditActions = [
  "profile_update",
  "identify_mold",
  "add_monitoring_folder",
  "add_mold",
  "edit_mold",
  "add_wikimold",
  "edit_wikimold",
  "archive_wikimold",
  "correct_flag_report",
  "disable_user",
  "ban_user",
  "approve_curator",
  "reject_curator",
  "resolve_report",
];

for (const action of auditActions) {
  router.get(
    `/${action}`,
    verifyUser(),
    async (req: Request, res: Response): Promise<void> => {
      // Attach action param to req.query for controller compatibility
      req.query.action = action;
      await getAuditLogs(req, res);
    }
  );
}

// Optionally, keep the generic endpoint for all logs
router.get(
  "/",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    await getAuditLogs(req, res);
  }
);

export default router;
