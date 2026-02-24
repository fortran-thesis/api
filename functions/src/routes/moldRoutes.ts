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
import {validateBody, validateParams} from "../middlewares/validation";
import {
  MoldIdSchema,
  MoldSchema,
  MoldUpdateSchema,
  NameParamSchema,
} from "../dto/moldDTO";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {upload} from "../middlewares/upload";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.post(
  "/",
  sanitizeBody,
  validateBody(MoldSchema),
  verifyUser(),
  upload.array("photos", 5),
  auditLog(AuditAction.ADD_MOLD, "Created mold"),
  cacheInvalidate("molds", "create"),
  async (req: Request, res: Response) => {
    createMold(req, res);
  }
);

router.get(
  "/",
  verifyUser(Role.CURATOR),
  cacheGet("molds"),
  async (req: Request, res: Response) => {
    getAllMolds(req, res);
  }
);

router.get(
  "/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(Role.CURATOR),
  async (req: Request, res: Response) => {
    getMoldById(req, res);
  }
);

router.get(
  "/name/:name",
  sanitizeParams,
  validateParams(NameParamSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    getMoldByName(req, res);
  }
);

router.patch(
  "/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  sanitizeBody,
  validateBody(MoldUpdateSchema),
  verifyUser(),
  auditLog(AuditAction.EDIT_MOLD, (req) => `Updated mold ${req.params.id}`),
  cacheInvalidate("molds", "update"),
  async (req: Request, res: Response) => {
    patchMold(req, res);
  }
);

router.delete(
  "/hard/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.DELETE_MOLD, (req) => `Deleted mold ${req.params.id}`),
  cacheInvalidate("molds", "delete"),
  async (req: Request, res: Response) => {
    deleteMold(req, res);
  }
);

router.delete(
  "/soft/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(),
  auditLog(AuditAction.SOFT_DELETE_MOLD, (req) => `Soft deleted mold ${req.params.id}`),
  cacheInvalidate("molds", "delete"),
  async (req: Request, res: Response) => {
    softDeleteMold(req, res);
  }
);

export default router;
