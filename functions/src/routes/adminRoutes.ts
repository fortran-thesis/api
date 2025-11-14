import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {Role} from "../types/enums";
import {disableUser, enableUser} from "../controllers/adminController";

const router = Router();

router.post(
  "/disable-user",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    disableUser(req, res);
  }
);

router.post(
  "/enable-user",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    enableUser(req, res);
  }
);

export default router;
