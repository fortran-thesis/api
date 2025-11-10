import {Router, Request, Response} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {Role} from "../types/enums";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {ReportCreateSchema, ReportIdSchema} from "../dto/reportDTO";
import {
  createReport,
  getAllReports,
  getReportById,
  patchReport,
  deleteReport,
  softDeleteReport,
} from "../controllers/reportController";

const router = Router();

// Create report
router.post(
  "/",
  verifyUser(),
  validateBody(ReportCreateSchema),
  async (req: Request, res: Response): Promise<void> => {
    await createReport(req, res);
  }
);

// Get all reports
router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    await getAllReports(req, res);
  }
);

// Get report by ID
router.get(
  "/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    await getReportById(req, res);
  }
);

// Update report
router.patch(
  "/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  validateBody(ReportCreateSchema.partial()),
  async (req: Request, res: Response): Promise<void> => {
    await patchReport(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    await deleteReport(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    await softDeleteReport(req, res);
  }
);

export default router;
