import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {
  MoldipediaIdSchema,
  MoldipediaUpdateSchema,
  SearchMoldipediaQuerySchema,
} from "../dto/moldipediaDTO";
import {
  createMoldipedia,
  getAllMoldipedia,
  getMoldipediaById,
  patchMoldipedia,
  deleteMoldipedia,
  softDeleteMoldipedia,
  getAllArchivedMoldipedia,
  archiveMoldipediaArticle,
  unarchiveMoldipediaArticle,
} from "../controllers/moldipediaController";
import {getMoldCasesByMoldipediaId} from "../controllers/moldCaseController";
import {sanitizeParams} from "../middlewares/sanitation";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {upload} from "../middlewares/upload";
import {parseMultipartJson} from "../middlewares/parseMultipartJson";

const router = Router();

router.post(
  "/",
  verifyUser(Role.CURATOR),
  upload.single("cover_photo"),
  parseMultipartJson(["details"]),
  auditLog(AuditAction.ADD_WIKIMOLD, "Created moldipedia article"),
  cacheInvalidate("moldipedia", "create"),
  async (req: Request, res: Response) => {
    await createMoldipedia(req, res);
  }
);

router.get(
  "/",
  validateQuery(SearchMoldipediaQuerySchema),
  cacheGet("moldipedia"),
  async (req: Request, res: Response) => {
    await getAllMoldipedia(req, res);
  }
);

// ─── Archived list (before /:id to avoid param capture) ────────────────────────
router.get(
  "/archive",
  verifyUser(),
  validateQuery(SearchMoldipediaQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldipedia(req, res);
  }
);

router.get(
  "/:id/cases",
  verifyUser(),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await getMoldCasesByMoldipediaId(req, res);
  }
);

router.get(
  "/:id",
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await getMoldipediaById(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(Role.CURATOR),
  upload.single("cover_photo"),
  parseMultipartJson(["details"]),
  validateBody(MoldipediaUpdateSchema),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.EDIT_WIKIMOLD, (req) => `Updated moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "update"),
  async (req: Request, res: Response) => {
    await patchMoldipedia(req, res);
  }
);

// ─── Archive / Unarchive ─────────────────────────────────────────────────────────
router.patch(
  "/:id/archive",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.ARCHIVE_WIKIMOLD, (req) => `Archived moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "update"),
  async (req: Request, res: Response) => {
    await archiveMoldipediaArticle(req, res);
  }
);

router.patch(
  "/:id/unarchive",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.UNARCHIVE_WIKIMOLD, (req) => `Unarchived moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "update"),
  async (req: Request, res: Response) => {
    await unarchiveMoldipediaArticle(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.DELETE_WIKIMOLD, (req) => `Deleted moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "delete"),
  async (req: Request, res: Response) => {
    await deleteMoldipedia(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.SOFT_DELETE_WIKIMOLD, (req) => `Soft deleted moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteMoldipedia(req, res);
  }
);

export default router;
