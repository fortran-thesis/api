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
import {
  SystemRequestCreateSchema,
  SystemRequestIdSchema,
  SystemRequestUpdateSchema,
} from "../dto/systemRequestDTO";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {
  createSystemRequest,
  getAllSystemRequests,
  getSystemRequestById,
  patchSystemRequest,
  deleteSystemRequest,
  softDeleteSystemRequest,
} from "../controllers/systemRequestController";

const router = Router();

// Create system request
router.post(
  "/",
  verifyUser(),
  validateBody(SystemRequestCreateSchema),
  auditLog(AuditAction.CREATE_SYSTEM_REQUEST, "Submitted system request"),
  cacheInvalidate("system-requests", "create"),
  async (req: Request, res: Response): Promise<void> => {
    await createSystemRequest(req, res);
  }
);

// Get all system requests
router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  cacheGet("system-requests"),
  async (req: Request, res: Response): Promise<void> => {
    await getAllSystemRequests(req, res);
  }
);

// Get system request by ID
router.get(
  "/:id",
  verifyUser(Role.ADMIN),
  validateParams(SystemRequestIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    await getSystemRequestById(req, res);
  }
);

// Patch system request
router.patch(
  "/:id",
  verifyUser(Role.ADMIN),
  validateBody(SystemRequestUpdateSchema),
  auditLog(AuditAction.UPDATE_SYSTEM_REQUEST, (req) => `Updated system request ${req.params.id}`),
  cacheInvalidate("system-requests", "update"),
  async (req: Request, res: Response): Promise<void> => {
    await patchSystemRequest(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.DELETE_SYSTEM_REQUEST, (req) => `Deleted system request ${req.params.id}`),
  cacheInvalidate("system-requests", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await deleteSystemRequest(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.SOFT_DELETE_SYSTEM_REQUEST, (req) => `Soft deleted system request ${req.params.id}`),
  cacheInvalidate("system-requests", "delete"),
  async (req: Request, res: Response): Promise<void> => {
    await softDeleteSystemRequest(req, res);
  }
);

export default router;
