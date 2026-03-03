import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {Role} from "../types/enums";

const router = Router();

router.post(
  "/wikimold/add",
  verifyUser(Role.CURATOR),
  async (_req: Request, _res: Response) => {}
);

router.patch(
  "/wikimold/edit/:id",
  verifyUser(Role.CURATOR),
  async (_req: Request, _res: Response) => {}
);

router.delete(
  "/wikimold/archive/:id",
  verifyUser(Role.CURATOR),
  async (_req: Request, _res: Response) => {}
);

router.post(
  "/wikimold/report/:id",
  verifyUser(Role.CURATOR),
  async (_req: Request, _res: Response) => {}
);

router.post(
  "/curator/report/:id",
  verifyUser(Role.CURATOR),
  async (_req: Request, _res: Response) => {}
);

export default router;
