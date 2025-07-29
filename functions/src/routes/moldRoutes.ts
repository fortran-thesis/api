import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import {
  createMold,
  deleteMold,
  getAllMolds,
  getMoldById,
  getMoldByName,
  patchMold,
  softDeleteMold,
} from "../controllers/moldController";
import { sanitizeBody, sanitizeParams } from "../middlewares/sanitation";
import { validateBody, validateParams } from "../middlewares/validation";
import {
  MoldIdSchema,
  MoldSchema,
  MoldUpdateSchema,
  NameParamSchema,
} from "../dto/moldDTO";
import { Role } from "../types/enums";
import { upload } from "../middlewares/upload";

const router = Router();

router.post(
  "/",
  sanitizeBody,
  validateBody(MoldSchema),
  verifyUser(),
  upload.array("photos", 5),
  async (req: Request, res: Response) => {
    createMold(req, res);
  }
);

router.get("/", verifyUser(), async (req: Request, res: Response) => {
  getAllMolds(req, res);
});

router.get(
  "/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    getMoldById(req, res);
  }
);

router.get(
  "/name/:name",
  sanitizeParams,
  validateParams(NameParamSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    getMoldByName(req, res);
  }
);

router.patch(
  "/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  sanitizeBody,
  validateBody(MoldUpdateSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    patchMold(req, res);
  }
);

router.delete(
  "/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    deleteMold(req, res);
  }
);

router.delete(
  "/soft/:id",
  sanitizeParams,
  validateParams(MoldIdSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    softDeleteMold(req, res);
  }
);

export default router