import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role} from "../types/enums";
import {
  MoldipediaCreateSchema,
  MoldipediaIdSchema,
  MoldipediaUpdateSchema,
  SearchMoldipediaQuerySchema,
} from "../dto/moldipediaDTO";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {
  createMoldipedia,
  getAllMoldipedia,
  getMoldipediaById,
  patchMoldipedia,
  deleteMoldipedia,
  softDeleteMoldipedia,
} from "../controllers/moldipediaController";
import {sanitizeBody, sanitizeParams} from "../middlewares/sanitation";

const router = Router();

// Create moldipedia (multipart/form-data, needs multer in parent route)

router.post(
  "/",
  verifyUser(Role.CURATOR),
  sanitizeBody,
  validateBody(MoldipediaCreateSchema),
  async (req: Request, res: Response) => {
    await createMoldipedia(req, res);
  }
);

// Get all moldipedia articles

router.get(
  "/",
  validateQuery(SearchMoldipediaQuerySchema),
  async (req: Request, res: Response) => {
    await getAllMoldipedia(req, res);
  }
);

// Get moldipedia by ID

router.get(
  "/:id",
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await getMoldipediaById(req, res);
  }
);

// Update moldipedia

router.patch(
  "/:id",
  verifyUser(Role.CURATOR),
  validateBody(MoldipediaUpdateSchema),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await patchMoldipedia(req, res);
  }
);

// Hard delete

router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await deleteMoldipedia(req, res);
  }
);

// Soft delete

router.delete(
  "/soft/:id",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(MoldipediaIdSchema),
  async (req: Request, res: Response) => {
    await softDeleteMoldipedia(req, res);
  }
);

export default router;
