import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {sanitizeBody} from "../middlewares/sanitation";
import {parseMultipartJson} from "../middlewares/parseMultipartJson";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {
  ReportIdSchema,
  MoldReportSchema,
  MoldReportUpdateSchema,
  CaseDetailCreateSchema,
  AssignMoldReportSchema,
  SearchMoldReportsQuerySchema,
} from "../dto/reportDTO";
import {
  createMoldReport,
  getAllMoldReports,
  getAllClosedMoldReports,
  getUnassignedMoldReports,
  getMoldReportById,
  patchMoldReport,
  deleteMoldReport,
  softDeleteMoldReport,
  postCaseDetail,
  getAssignedMoldReports,
  getAssignedReportsCountController,
  getMoldReportCountsController,
  getAllMoldReportsByUser,
  getClosedMoldReportsByUser,
  assignReport,
  rejectReport,
  searchMoldReports,
  getMoldReportMonthlyTotalsController,
  getCombinedTotalCountsController,
  getMoldCasePriorityBreakdownController,
  getResolvedMoldReportsCountController,
} from "../controllers/moldReportController";
import {Role, AuditAction} from "../types/enums";
import {NotificationType} from "../types/models/notificationTypes";
import {auditLog} from "../middlewares/auditLogger";
import {notify} from "../middlewares/notificationMiddleware";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.post(
  "/",
  verifyUser(),
  parseMultipartJson(["details"]),
  sanitizeBody,
  validateBody(MoldReportSchema),
  auditLog(AuditAction.CREATE_MOLD_REPORT, "Submitted mold report"),
  cacheInvalidate("mold-reports", "create"),
  async (req: Request, res: Response) => {
    await createMoldReport(req, res);
  }
);

// Public endpoint - resolved count
router.get(
  "/public/resolved-count",
  async (req: Request, res: Response) => {
    await getResolvedMoldReportsCountController(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  cacheGet("mold-reports"),
  async (req: Request, res: Response) => {
    await getAllMoldReports(req, res);
  }
);

router.post(
  "/:id/case-details",
  sanitizeBody,
  verifyUser(),
  validateParams(ReportIdSchema),
  validateBody(CaseDetailCreateSchema),
  cacheInvalidate("mold-reports", "update"),
  async (req: Request, res: Response) => {
    await postCaseDetail(req, res);
  }
);

router.get(
  "/unassigned",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getUnassignedMoldReports(req, res);
  }
);

router.get(
  "/assigned",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAssignedMoldReports(req, res);
  }
);

router.get(
  "/assigned/count",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    await getAssignedReportsCountController(req, res);
  }
);

router.patch(
  "/:id/assign",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  validateBody(AssignMoldReportSchema),
  auditLog(AuditAction.ASSIGN_MOLD_REPORT, (req) => `Assigned report ${req.params.id}`),
  notify({
    type: NotificationType.MOLD_REPORT_ASSIGNED,
    recipientsFn: (req, body) => [
      {recipientId: body?.data?.user_id, extraContext: {role: "farmer"}},
      {recipientId: req.body.assigned_mycologist_id, extraContext: {role: "mycologist"}},
    ],
    referenceType: "mold_report",
    contextFn: (_req, body) => ({case_name: body?.data?.case_name ?? ""}),
  }),
  cacheInvalidate("mold-reports", "update"),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await assignReport(req, res);
  }
);

router.patch(
  "/:id/reject",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  auditLog(AuditAction.REJECT_MOLD_REPORT, (req) => `Rejected report ${req.params.id}`),
  notify({
    type: NotificationType.MOLD_REPORT_REJECTED,
    recipientsFn: (_req, body) => [
      {recipientId: body?.data?.user_id},
    ],
    referenceType: "mold_report",
    contextFn: (_req, body) => ({case_name: body?.data?.case_name ?? ""}),
  }),
  cacheInvalidate("mold-reports", "update"),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await rejectReport(req, res);
  }
);

router.get(
  "/closed",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllClosedMoldReports(req, res);
  }
);

// Legacy alias kept for backward compatibility
router.get(
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllClosedMoldReports(req, res);
  }
);

router.get(
  "/counts/statuses",
  verifyUser(),
  async (req: Request, res: Response) => {
    await getMoldReportCountsController(req, res);
  }
);

router.get(
  "/counts/monthly",
  verifyUser(),
  async (req: Request, res: Response) => {
    await getMoldReportMonthlyTotalsController(req, res);
  }
);

router.get(
  "/counts/totals",
  verifyUser(),
  async (req: Request, res: Response) => {
    await getCombinedTotalCountsController(req, res);
  }
);

router.get(
  "/counts/priorities",
  verifyUser(),
  async (req: Request, res: Response) => {
    await getMoldCasePriorityBreakdownController(req, res);
  }
);

router.get(
  "/user",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllMoldReportsByUser(req, res);
  }
);

router.get(
  "/user/closed",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getClosedMoldReportsByUser(req, res);
  }
);

// Search endpoint - place before dynamic routes
router.get(
  "/search",
  verifyUser(),
  validateQuery(SearchMoldReportsQuerySchema),
  async (req: Request, res: Response) => {
    await searchMoldReports(req, res);
  }
);

router.get(
  "/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await getMoldReportById(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  validateBody(MoldReportUpdateSchema),
  auditLog(AuditAction.UPDATE_MOLD_REPORT, (req) => `Updated report ${req.params.id}`),
  cacheInvalidate("mold-reports", "update"),
  async (req: Request, res: Response) => {
    await patchMoldReport(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  auditLog(AuditAction.DELETE_MOLD_REPORT, (req) => `Deleted report ${req.params.id}`),
  cacheInvalidate("mold-reports", "delete"),
  async (req: Request, res: Response) => {
    await deleteMoldReport(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  auditLog(AuditAction.SOFT_DELETE_MOLD_REPORT, (req) => `Closed report ${req.params.id}`),
  cacheInvalidate("mold-reports", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteMoldReport(req, res);
  }
);

export default router;
