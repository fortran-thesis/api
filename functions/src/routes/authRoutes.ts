import { Request, Response, Router } from "express";
import {
  changeUserEmail,
  changeUserPassword,
  createUser,
  loginUser,
  verifyUserEmail,
} from "../controllers/authController";
import { validateBody } from "../middlewares/validation";
import {
  RegisterSchema,
  LoginSchema,
  EmailSchema,
  ChangeEmailSchema,
} from "../dto/dto";
import { sanitizeBody } from "../middlewares/sanitation";
import { verifyUser } from "../middlewares/verification";

const router = Router();

router.post(
  "/register",
  sanitizeBody,
  validateBody(RegisterSchema),
  async (req: Request, res: Response) => {
    createUser(req, res);
  }
);

router.post(
  "/login",
  sanitizeBody,
  validateBody(LoginSchema),
  async (req: Request, res: Response) => {
    loginUser(req, res);
  }
);

//TODO: endpoints
router.post(
  "/reset-password",
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    changeUserPassword(req, res);
  }
);

router.post(
  "/verify-email",
  sanitizeBody,
  validateBody(EmailSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    verifyUserEmail(req, res);
  }
);

router.post(
  "/change-email",
  sanitizeBody,
  validateBody(ChangeEmailSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    changeUserEmail(req, res);
  }
);

export default router;
