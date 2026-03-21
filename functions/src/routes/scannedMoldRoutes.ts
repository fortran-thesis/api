import {Request, Response, Router} from "express";
import {upload} from "../middlewares/upload";
import {verifyUser} from "../middlewares/verification";
import {sanitizeBody} from "../middlewares/sanitation";
import {validateBody, validateParams, validateQuery} from "../middlewares/validation";
import {AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {ScannedMoldIdSchema, ScannedMoldQuerySchema, ScannedMoldUpdateSchema} from "../dto/scannedMoldDTO";
import {
  createScannedMold,
  getAllScannedMolds,
  getScannedMoldById,
  patchScannedMold,
  deleteScannedMold,
  softDeleteScannedMold,
} from "../controllers/scannedMoldController";

const router = Router();

router.post(
  "/",
  verifyUser(),
  sanitizeBody,
  upload.single("photo"),
  auditLog(AuditAction.IDENTIFY_MOLD, "Scanned mold image"),
  cacheInvalidate("scanned-molds", "create"),
  async (req: Request, res: Response): Promise<void> => {
    await createScannedMold(req, res);
  }
);

router.get("/", verifyUser(), validateQuery(ScannedMoldQuerySchema), cacheGet("scanned-molds"), async (req: Request, res: Response): Promise<void> => {
  await getAllScannedMolds(req, res);
});

router.get("/:id", verifyUser(), validateParams(ScannedMoldIdSchema), async (req: Request, res: Response): Promise<void> => {
  await getScannedMoldById(req, res);
});

router.patch(
  "/:id",
  verifyUser(),
  sanitizeBody,
  validateParams(ScannedMoldIdSchema),
  validateBody(ScannedMoldUpdateSchema),
  auditLog(AuditAction.UPDATE_SCANNED_MOLD, (req) => `Updated scan ${req.params.id}`),
  cacheInvalidate("scanned-molds", "update"),
  async (req: Request, res: Response): Promise<void> => {
    await patchScannedMold(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(ScannedMoldIdSchema),
  auditLog(AuditAction.DELETE_SCANNED_MOLD, (req) => `Deleted scan ${req.params.id}`),
  cacheInvalidate("scanned-molds", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await deleteScannedMold(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(ScannedMoldIdSchema),
  auditLog(AuditAction.SOFT_DELETE_SCANNED_MOLD, (req) => `Soft deleted scan ${req.params.id}`),
  cacheInvalidate("scanned-molds", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await softDeleteScannedMold(req, res);
  }
);

export default router;
