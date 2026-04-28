import {Router} from "express";
import {rateLimit} from "express-rate-limit";
import {
  createFlagReport,
  getAllFlagReports,
  getFlagReportById,
  patchFlagReport,
  deleteFlagReport,
  softDeleteFlagReport,
} from "../controllers/flagReportController";
import {verifyUser} from "../middlewares/verification";
import {Role, AuditAction} from "../types/enums";
import {NotificationType} from "../types/models/notificationTypes";
import {auditLog} from "../middlewares/auditLogger";
import {notify} from "../middlewares/notificationMiddleware";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {CreateFlagReportSchema, FlagReportIdSchema, UpdateFlagReportSchema} from "../dto/flagReportDTO";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {flagReportCreateLimiter} from "../configs/limit";

const router = Router();


// Create flag report
router.post(
  "/",
  verifyUser(),
  rateLimit(flagReportCreateLimiter),
  validateBody(CreateFlagReportSchema),
  auditLog(AuditAction.CREATE_FLAG_REPORT, "Flagged content"),
  notify({
    type: NotificationType.FLAG_REPORT_CREATED,
    recipientsFn: () => {
      // TODO: resolve admin user IDs dynamically (query users where role == admin).
      // For now, returns an empty array until an admin-resolver helper is added.
      return [];
    },
    referenceType: "flag_report",
    contextFn: (req) => ({content_type: req.body.content_type ?? "content"}),
  }),
  cacheInvalidate("flag-reports", "create"),
  async (req, res) => {
    await createFlagReport(req, res);
  }
);

// Get all flag reports
router.get(
  "/",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  cacheGet("flag-reports"),
  async (req, res) => {
    await getAllFlagReports(req, res);
  }
);

// Get flag report by id
router.get(
  "/:id",
  verifyUser(Role.CURATOR),
  validateParams(FlagReportIdSchema),
  async (req, res) => {
    await getFlagReportById(req, res);
  }
);

// Patch flag report
router.patch(
  "/:id",
  verifyUser(Role.CURATOR),
  validateParams(FlagReportIdSchema),
  validateBody(UpdateFlagReportSchema),
  notify({
    type: NotificationType.FLAG_REPORT_RESOLVED,
    recipientsFn: (req, body) => {
      // Only notify when the report is being resolved
      if (req.body.status !== "resolved") return [];
      const reporterId = body?.data?.reporter_id;
      return reporterId ? [{recipientId: reporterId}] : [];
    },
    referenceType: "flag_report",
  }),
  cacheInvalidate("flag-reports", "update"),
  async (req, res) => {
    await patchFlagReport(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  validateParams(FlagReportIdSchema),
  auditLog(AuditAction.DELETE_FLAG_REPORT, (req) => `Deleted flag report ${req.params.id}`),
  cacheInvalidate("flag-reports", "delete"),
  async (req, res) => {
    await deleteFlagReport(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  validateParams(FlagReportIdSchema),
  auditLog(AuditAction.SOFT_DELETE_FLAG_REPORT, (req) => `Soft deleted flag report ${req.params.id}`),
  cacheInvalidate("flag-reports", "delete"),
  async (req, res) => {
    await softDeleteFlagReport(req, res);
  }
);

export default router;
