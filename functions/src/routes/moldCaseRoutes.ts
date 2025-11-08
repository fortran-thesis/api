import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {MoldIdSchema} from "../dto/moldDTO";
import { ReportIdSchema } from "../dto/reportDTO";
import {Role} from "../types/enums";
import { CultivationLogSchema, CultivationDetailsSchema } from "../dto/moldDTO";
import { validateBody } from "../middlewares/validation";
import {upload} from "../middlewares/upload";
import {
  createMoldCase,
  getAllMoldCases,
  getAssignedMoldCases,
  getAllArchivedMoldCases,
  patchMoldCase,
  deleteMoldCase,
  softDeleteMoldCase,
  getMoldCaseByReportId,
  addCultivationLog,
  updateCultivationDetails,
  analyzeCultivationLogImage,
} from "../controllers/moldCaseController";

const router = Router();

router.post(
  "/",
  verifyUser(),
  async (req: Request, res: Response) => {
    await createMoldCase(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllMoldCases(req, res);
  }
);

router.get(
  "/assigned",
  verifyUser(Role.CURATOR),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAssignedMoldCases(req, res);
  }
);

router.get(
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldCases(req, res);
  }
);

router.get(
  "/by-report/:id",
  verifyUser(),
  validateParams(ReportIdSchema),
  async (req: Request, res: Response) => {
    await getMoldCaseByReportId(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await patchMoldCase(req, res);
  }
);

router.post(
  "/:id/logs",
  verifyUser(),
  validateParams(MoldIdSchema),
  upload.single("image"),
  validateBody(CultivationLogSchema),
  async (req: Request, res: Response) => {
    // controller expects param name caseId, the route uses :id so controller will read req.params.id
    await addCultivationLog(req, res);
  }
);

router.patch(
  "/:id/cultivation-details",
  verifyUser(),
  validateParams(MoldIdSchema),
  validateBody(CultivationDetailsSchema),
  async (req: Request, res: Response) => {
    await updateCultivationDetails(req, res);
  }
);

router.post(
  "/:id/analyze-cultivation",
  verifyUser(),
  validateParams(MoldIdSchema),
  upload.single("image"),
  async (req: Request, res: Response) => {
    await analyzeCultivationLogImage(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await deleteMoldCase(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await softDeleteMoldCase(req, res);
  }
);

export default router;
