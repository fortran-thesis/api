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
} from "../controllers/moldipediaController";
import {sanitizeParams} from "../middlewares/sanitation";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {upload} from "../middlewares/upload";

const router = Router();

router.post(
  "/",
  verifyUser(Role.CURATOR),
  upload.single("cover_photo"),
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
  validateBody(MoldipediaUpdateSchema),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  auditLog(AuditAction.EDIT_WIKIMOLD, (req) => `Updated moldipedia ${req.params.id}`),
  cacheInvalidate("moldipedia", "update"),
  async (req: Request, res: Response) => {
    await patchMoldipedia(req, res);
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
