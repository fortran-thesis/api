import { Router } from "express";
import {
  createFlagReport,
  getAllFlagReports,
  getFlagReportById,
  patchFlagReport,
  deleteFlagReport,
  softDeleteFlagReport,
} from "../controllers/flagReportController";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import { PaginationQuerySchema } from "../dto/paginationDTO";
import { CreateFlagReportSchema, FlagReportIdSchema } from "../dto/flagReportDTO";

const router = Router();


// Create flag report
router.post(
  "/",
  verifyUser(),
  validateBody(CreateFlagReportSchema),
  async (req, res) => {
    await createFlagReport(req, res);
  }
);

// Get all flag reports
router.get(
  "/",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  async (req, res) => {
    await getAllFlagReports(req, res);
  }
);

// Get flag report by id
router.get(
  "/:id",
  verifyUser(Role.CURATOR),
  validateParams(FlagReportIdSchema),
  async (req, res) => {
    await getFlagReportById(req, res);
  }
);

// Patch flag report
router.patch(
  "/:id",
  verifyUser(Role.CURATOR),
  validateParams(FlagReportIdSchema),
  async (req, res) => {
    await patchFlagReport(req, res);
  }
);

// Hard delete
router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  validateParams(FlagReportIdSchema),
  async (req, res) => {
    await deleteFlagReport(req, res);
  }
);

// Soft delete
router.delete(
  "/soft/:id",
  verifyUser(Role.ADMIN),
  validateParams(FlagReportIdSchema),
  async (req, res) => {
    await softDeleteFlagReport(req, res);
  }
);

export default router;
