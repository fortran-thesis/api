import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import {
  createMold,
  deleteMold,
  getAllMolds,
  getMoldById,
  getMoldByName,
  patchMold,
} from "../controllers/moldController";
import { sanitizeBody, sanitizeParams } from "../middlewares/sanitation";
import { validateBody, validateParams } from "../middlewares/validation";
import { MoldIdSchema, MoldSchema, NameParamSchema } from "../dto/moldDTO";
import { Role } from "../types/enums";

const router = Router();

router.post("/", verifyUser(), async (req: Request, res: Response) => {
  createMold(req, res);
});

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
  validateBody(MoldSchema),
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
