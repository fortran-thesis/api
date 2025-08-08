import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";

const router = Router();

router.post(
  "/disable-user",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {}
);

router.post(
  "/enable-user",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {}
);

router.post(
  "/ban-user",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {}
);

router.post(
  "/approve-curator",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {}
);

router.post(
  "/reject-curator",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {}
);

export default router;
