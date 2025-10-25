import {Router, Request, Response} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role} from "../types/enums";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {
  SystemRequestCreateSchema,
  SystemRequestIdSchema,
  SystemRequestUpdateSchema,
} from "../dto/systemRequestDTO";
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
  async (req: Request, res: Response): Promise<void> => {
    await createSystemRequest(req, res);
  }
);

// Get all system requests
router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
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
  async (req: Request, res: Response): Promise<void> => {
    await patchSystemRequest(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    await deleteSystemRequest(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    await softDeleteSystemRequest(req, res);
  }
);

export default router;
