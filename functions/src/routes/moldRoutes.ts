import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  createMold,
  deleteMold,
  getAllMolds,
  getMoldById,
  getMoldByName,
  patchMold,
  softDeleteMold,
} from "../controllers/moldController";
import {sanitizeBody, sanitizeParams} from "../middlewares/sanitation";
import {validateBody, validateParams, validateQuery} from "../middlewares/validation";
import {
  MoldIdSchema,
  MoldSchema,
  MoldUpdateSchema,
  NameParamSchema,
} from "../dto/moldDTO";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {upload} from "../middlewares/upload";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.post(
  "/",
  verifyUser(),
  sanitizeBody,
  validateBody(MoldSchema),
  upload.array("photos", 5),
  auditLog(AuditAction.ADD_MOLD, "Created mold"),
  cacheInvalidate("molds", "create"),
  async (req: Request, res: Response) => {
    await createMold(req, res);
  }
);

router.get(
  "/",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  cacheGet("molds"),
  async (req: Request, res: Response) => {
    await getAllMolds(req, res);
  }
);

router.get(
  "/:id",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await getMoldById(req, res);
  }
);

router.get(
  "/name/:name",
  verifyUser(),
  sanitizeParams,
  validateParams(NameParamSchema),
  async (req: Request, res: Response) => {
    await getMoldByName(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  sanitizeParams,
  validateParams(MoldIdSchema),
  sanitizeBody,
  validateBody(MoldUpdateSchema),
  auditLog(AuditAction.EDIT_MOLD, (req) => `Updated mold ${req.params.id}`),
  cacheInvalidate("molds", "update"),
  async (req: Request, res: Response) => {
    await patchMold(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(MoldIdSchema),
  auditLog(AuditAction.DELETE_MOLD, (req) => `Deleted mold ${req.params.id}`),
  cacheInvalidate("molds", "delete"),
  async (req: Request, res: Response) => {
    await deleteMold(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  sanitizeParams,
  validateParams(MoldIdSchema),
  auditLog(AuditAction.SOFT_DELETE_MOLD, (req) => `Soft deleted mold ${req.params.id}`),
  cacheInvalidate("molds", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteMold(req, res);
  }
);

export default router;