import {Router, Request, Response} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {ReportCreateSchema, ReportIdSchema} from "../dto/reportDTO";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {
  createReport,
  getAllReports,
  getReportById,
  patchReport,
  deleteReport,
  softDeleteReport,
} from "../controllers/reportController";

const router = Router();

// Create report
router.post(
  "/",
  verifyUser(),
  validateBody(ReportCreateSchema),
  auditLog(AuditAction.CREATE_REPORT, "Reported user"),
  cacheInvalidate("reports", "create"),
  async (req: Request, res: Response): Promise<void> => {
    await createReport(req, res);
  }
);

// Get all reports
router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  cacheGet("reports"),
  async (req: Request, res: Response): Promise<void> => {
    await getAllReports(req, res);
  }
);

// Get report by ID
router.get(
  "/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    await getReportById(req, res);
  }
);

// Update report
router.patch(
  "/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  validateBody(ReportCreateSchema.partial()),
  auditLog(AuditAction.UPDATE_REPORT, (req) => `Updated report ${req.params.id}`),
  cacheInvalidate("reports", "update"),
  async (req: Request, res: Response): Promise<void> => {
    await patchReport(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  auditLog(AuditAction.DELETE_REPORT, (req) => `Deleted report ${req.params.id}`),
  cacheInvalidate("reports", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await deleteReport(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  auditLog(AuditAction.SOFT_DELETE_REPORT, (req) => `Soft deleted report ${req.params.id}`),
  cacheInvalidate("reports", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await softDeleteReport(req, res);
  }
);

export default router;
