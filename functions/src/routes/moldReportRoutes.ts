import {Request, Response, Router} from "express";
import {upload} from "../middlewares/upload";
import {verifyUser} from "../middlewares/verification";
import {sanitizeBody} from "../middlewares/sanitation";
import {validateBody, validateParams, validateQuery} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {ReportIdSchema, MoldReportSchema, MoldReportUpdateSchema} from "../dto/reportDTO";
import {
  createMoldReport,
  getAllMoldReports,
  getAllArchivedMoldReports,
  getUnassignedMoldReports,
  getMoldReportById,
  patchMoldReport,
  deleteMoldReport,
  softDeleteMoldReport,
  postCaseDetail,
  getAssignedMoldReports,
} from "../controllers/moldReportController";
import {Role} from "../types/enums";
import {CaseDetailCreateSchema} from "../dto/reportDTO";

const router = Router();

router.post(
  "/",
  sanitizeBody,
  verifyUser(),
  upload.single("cover_photo"),
  validateBody(MoldReportSchema),
  async (req: Request, res: Response) => {
    await createMoldReport(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllMoldReports(req, res);
  }
);

router.get(
  "/unassigned",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getUnassignedMoldReports(req, res);
  }
);

router.get(
  "/assigned",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAssignedMoldReports(req, res);
  }
);

router.post(
  "/:id/case-details",
  sanitizeBody,
  verifyUser(),
  validateParams(ReportIdSchema),
  validateBody(CaseDetailCreateSchema),
  async (req: Request, res: Response) => {
    await postCaseDetail(req, res);
  }
);

router.get(
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldReports(req, res);
  }
);

router.get(
  "/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await getMoldReportById(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  validateBody(MoldReportUpdateSchema),
  async (req: Request, res: Response) => {
    await patchMoldReport(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await deleteMoldReport(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await softDeleteMoldReport(req, res);
  }
);

export default router;
