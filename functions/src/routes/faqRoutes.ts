import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role} from "../types/enums";
import {
  FAQCreateSchema,
  FAQIdSchema,
  FAQUpdateSchema,
} from "../dto/faqDTO";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {
  createFAQ,
  getAllFAQ,
  getFAQById,
  patchFAQ,
  deleteFAQ,
  softDeleteFAQ,
} from "../controllers/faqController";
import {sanitizeBody, sanitizeParams} from "../middlewares/sanitation";

const router = Router();

// Create FAQ (Curator/Admin only)
router.post(
  "/",
  verifyUser(Role.CURATOR),
  sanitizeBody,
  validateBody(FAQCreateSchema),
  async (req: Request, res: Response) => {
    await createFAQ(req, res);
  }
);

// Get all FAQs (Public)
router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllFAQ(req, res);
  }
);

// Get FAQ by ID (Public)
router.get(
  "/:id",
  verifyUser(),
  sanitizeParams,
  validateParams(FAQIdSchema),
  async (req: Request, res: Response) => {
    await getFAQById(req, res);
  }
);

// Update FAQ (Curator/Admin only)
router.patch(
  "/:id",
  verifyUser(Role.CURATOR),
  sanitizeParams,
  validateParams(FAQIdSchema),
  sanitizeBody,
  validateBody(FAQUpdateSchema),
  async (req: Request, res: Response) => {
    await patchFAQ(req, res);
  }
);

// Hard delete FAQ (Admin only)
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(FAQIdSchema),
  async (req: Request, res: Response) => {
    await deleteFAQ(req, res);
  }
);

// Soft delete FAQ (Admin only)
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(FAQIdSchema),
  async (req: Request, res: Response) => {
    await softDeleteFAQ(req, res);
  }
);

export default router;
