import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {validateBody} from "../middlewares/validation";
import {Role, AuditAction} from "../types/enums";
import {NotificationType} from "../types/models/notificationTypes";
import {auditLog} from "../middlewares/auditLogger";
import {notify} from "../middlewares/notificationMiddleware";
import {cacheInvalidate} from "../middlewares/cacheMiddleware";
import {disableUser, enableUser, banUserController} from "../controllers/adminController";
import {UserIdSchema} from "../dto/dto";

const router = Router();

router.post(
  "/disable-user",
  verifyUser(Role.ADMIN),
  validateBody(UserIdSchema),
  auditLog(AuditAction.DISABLE_USER, "Disabled user", (req) => req.body.id),
  notify({
    type: NotificationType.USER_DISABLED,
    recipientsFn: (req) => [{recipientId: req.body.id}],
    referenceType: "user",
    referenceIdFn: (req) => req.body.id,
  }),
  cacheInvalidate("users", "update"),
  cacheInvalidate("mycologists", "update"),
  async (req: Request, res: Response) => {
    await disableUser(req, res);
  }
);

router.post(
  "/enable-user",
  verifyUser(Role.ADMIN),
  validateBody(UserIdSchema),
  auditLog(AuditAction.ENABLE_USER, "Enabled user", (req) => req.body.id),
  notify({
    type: NotificationType.USER_ENABLED,
    recipientsFn: (req) => [{recipientId: req.body.id}],
    referenceType: "user",
    referenceIdFn: (req) => req.body.id,
  }),
  cacheInvalidate("users", "update"),
  cacheInvalidate("mycologists", "update"),
  async (req: Request, res: Response) => {
    await enableUser(req, res);
  }
);

router.post(
  "/ban-user",
  verifyUser(Role.ADMIN),
  validateBody(UserIdSchema),
  auditLog(AuditAction.BAN_USER, "Banned user", (req) => req.body.id),
  notify({
    type: NotificationType.USER_BANNED,
    recipientsFn: (req) => [{recipientId: req.body.id}],
    referenceType: "user",
    referenceIdFn: (req) => req.body.id,
  }),
  cacheInvalidate("users", "update"),
  cacheInvalidate("mycologists", "update"),
  async (req: Request, res: Response) => {
    await banUserController(req, res);
  }
);

export default router;
