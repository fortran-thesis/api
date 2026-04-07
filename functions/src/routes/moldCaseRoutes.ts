import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateParams,
  validateQuery,
  validateBody} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {
  MoldIdSchema,
  CultivationLogSchema,
  CultivationDetailsSchema,
  SearchMoldCasesQuerySchema,
  FinalizeVerdictSchema,
  MoldCaseCreateSchema,
  CultureSessionCreateSchema,
  CultureSessionIdSchema,
  CultureSessionReassignSchema,
} from "../dto/moldDTO";
import {ReportIdSchema} from "../dto/reportDTO";
import {AuditAction, Role} from "../types/enums";
import {NotificationType} from "../types/models/notificationTypes";
import {upload} from "../middlewares/upload";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {auditLog} from "../middlewares/auditLogger";
import {notify} from "../middlewares/notificationMiddleware";
import {
  createMoldCase,
  getAllMoldCases,
  getAssignedMoldCases,
  getAllArchivedMoldCases,
  patchMoldCase,
  deleteMoldCase,
  softDeleteMoldCase,
  getMoldCaseByReportId,
  addCultivationLog,
  updateCultivationDetails,
  analyzeCultivationLogImage,
  searchAssignedMoldCases,
  getMoldCasesCountMetadataController,
  getMoldCaseById,
  archiveMoldCase,
  unarchiveMoldCase,
  getCultivationLogs,
  removeCultivationLog,
  finalizeVerdict,
  listCultureSessions,
  listAvailableCultureSessions,
  createCultureSession,
  endCultureSessionEarly,
  reassignCultureSession,
  deleteCultureSession,
} from "../controllers/moldCaseController";
const router = Router();

router.post(
  "/",
  verifyUser(),
  validateBody(MoldCaseCreateSchema),
  cacheInvalidate("mold-cases-all", "create"),
  cacheInvalidate("mold-cases-assigned", "create"),
  async (req: Request, res: Response) => {
    await createMoldCase(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  cacheGet("mold-cases-all"),
  async (req: Request, res: Response) => {
    await getAllMoldCases(req, res);
  }
);

router.get(
  "/counts/metadata",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    await getMoldCasesCountMetadataController(req, res);
  }
);

router.get(
  "/assigned",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  cacheGet("mold-cases-assigned"),
  async (req: Request, res: Response) => {
    await getAssignedMoldCases(req, res);
  }
);

router.get(
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldCases(req, res);
  }
);

router.get(
  "/by-report/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await getMoldCaseByReportId(req, res);
  }
);

router.get(
  "/search",
  verifyUser(),
  validateQuery(SearchMoldCasesQuerySchema),
  async (req: Request, res: Response) => {
    await searchAssignedMoldCases(req, res);
  }
);

// ─── Single case (must come after all fixed-segment GET routes) ────────────────
router.get(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await getMoldCaseById(req, res);
  }
);

// ─── Case History / Archive actions ──────────────────────────────────────────
router.patch(
  "/:id/archive",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await archiveMoldCase(req, res);
  }
);

router.patch(
  "/:id/unarchive",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await unarchiveMoldCase(req, res);
  }
);

// ─── Cultivation Logs (Case History detail) ───────────────────────────────────
router.get(
  "/:id/logs",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await getCultivationLogs(req, res);
  }
);

router.delete(
  "/:id/logs/:logId",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await removeCultivationLog(req, res);
  }
);

router.get(
  "/:id/culture-sessions",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await listCultureSessions(req, res);
  }
);

router.get(
  "/:id/culture-sessions/available",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await listAvailableCultureSessions(req, res);
  }
);

router.post(
  "/:id/culture-sessions",
  verifyUser(),
  validateParams(MoldIdSchema),
  validateBody(CultureSessionCreateSchema),
  async (req: Request, res: Response) => {
    await createCultureSession(req, res);
  }
);

router.patch(
  "/:id/culture-sessions/:cultureId/end-early",
  verifyUser(),
  validateParams(CultureSessionIdSchema),
  async (req: Request, res: Response) => {
    await endCultureSessionEarly(req, res);
  }
);

router.patch(
  "/:id/culture-sessions/:cultureId/reassign",
  verifyUser(),
  validateParams(CultureSessionIdSchema),
  validateBody(CultureSessionReassignSchema),
  async (req: Request, res: Response) => {
    await reassignCultureSession(req, res);
  }
);

router.delete(
  "/:id/culture-sessions/:cultureId",
  verifyUser(),
  validateParams(CultureSessionIdSchema),
  async (req: Request, res: Response) => {
    await deleteCultureSession(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await patchMoldCase(req, res);
  }
);

router.post(
  "/:id/logs",
  verifyUser(),
  validateParams(MoldIdSchema),
  upload.single("image"),
  // Parse form data - characteristics comes as JSON string from multipart
  (req: Request, res: Response, next) => {
    if (req.body.characteristics && typeof req.body.characteristics === "string") {
      try {
        req.body.characteristics = JSON.parse(req.body.characteristics);
      } catch (e) {
        // If JSON parsing fails, leave as is
      }
    }
    next();
  },
  validateBody(CultivationLogSchema),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    // controller expects param name caseId, the route uses :id so controller will read req.params.id
    await addCultivationLog(req, res);
  }
);

router.patch(
  "/:id/cultivation-details",
  verifyUser(),
  validateParams(MoldIdSchema),
  validateBody(CultivationDetailsSchema),
  auditLog(AuditAction.UPDATE_MOLD_CASE, (req) => `Updated cultivation details for case ${req.params.id}`),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await updateCultivationDetails(req, res);
  }
);

router.post(
  "/:id/analyze-cultivation",
  verifyUser(),
  validateParams(MoldIdSchema),
  upload.single("image"),
  async (req: Request, res: Response) => {
    await analyzeCultivationLogImage(req, res);
  }
);

router.patch(
  "/:id/verdict",
  verifyUser(),
  validateParams(MoldIdSchema),
  validateBody(FinalizeVerdictSchema),
  auditLog(AuditAction.RESOLVE_MOLD_REPORT, (req) => `Finalized verdict for case ${req.params.id}`),
  notify({
    type: NotificationType.MOLD_REPORT_RESOLVED,
    recipientsFn: (_req, body) => [
      {recipientId: body?.data?.report_owner_id},
    ],
    referenceType: "mold_case",
    contextFn: (_req, body) => ({case_name: body?.data?.case_name ?? ""}),
  }),
  cacheInvalidate("mold-cases-all", "update"),
  cacheInvalidate("mold-cases-assigned", "update"),
  async (req: Request, res: Response) => {
    await finalizeVerdict(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("mold-cases-all", "delete"),
  cacheInvalidate("mold-cases-assigned", "delete"),
  async (req: Request, res: Response) => {
    await deleteMoldCase(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("mold-cases-all", "delete"),
  cacheInvalidate("mold-cases-assigned", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteMoldCase(req, res);
  }
);

export default router;
