import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {Role, AuditAction} from "../types/enums";
import {validateBody} from "../middlewares/validation";
import {RegisterMycologistSchema} from "../dto/mycologistDTO";
import {registerMycologistController} from "../controllers/mycologistController";
import {sanitizeBody} from "../middlewares/sanitation";
import {auditLog} from "../middlewares/auditLogger";
import {cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.post(
  "/register",
  verifyUser(Role.ADMIN),
  sanitizeBody,
  validateBody(RegisterMycologistSchema),
  auditLog(AuditAction.CREATE_MYCOLOGIST, "Created mycologist account"),
  cacheInvalidate("mycologists", "create"),
  cacheInvalidate("users", "create"),
  async (req: Request, res: Response) => {
    await registerMycologistController(req, res);
  }
);

export default router;
