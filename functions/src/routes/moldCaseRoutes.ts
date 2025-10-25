import {Request, Response, Router} from "express";
import {upload} from "../middlewares/upload";
import {verifyUser} from "../middlewares/verification";
import {
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {MoldIdSchema} from "../dto/moldDTO";
import {
  createMoldCase,
  getAllMoldCases,
  getAllArchivedMoldCases,
  patchMoldCase,
  deleteMoldCase,
  softDeleteMoldCase,
} from "../controllers/moldCaseController";

const router = Router();

router.post(
  "/",
  verifyUser(),
  upload.single("photo"),
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
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldCases(req, res);
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
