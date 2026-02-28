import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {disableUser, enableUser, banUserController} from "../controllers/adminController";

const router = Router();

router.post(
  "/disable-user",
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.DISABLE_USER, "Disabled user", (req) => req.body.id),
  async (req: Request, res: Response) => {
    await disableUser(req, res);
  }
);

router.post(
  "/enable-user",
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.ENABLE_USER, "Enabled user", (req) => req.body.id),
  async (req: Request, res: Response) => {
    await enableUser(req, res);
  }
);

router.post(
  "/ban-user",
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.BAN_USER, "Banned user", (req) => req.body.id),
  async (req: Request, res: Response) => {
    await banUserController(req, res);
  }
);

export default router;