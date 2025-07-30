import { Request, Response, Router } from "express";
import {
  changeUserPassword,
  checkVerificationCodeEmail,
  createUser,
  loginUser,
  oAuth,
  sendVerificationCodeEmail,
  verifiedChangePassword,
  verifiedForgetUsername,
} from "../controllers/authController";
import { validateBody } from "../middlewares/validation";
import {
  RegisterSchema,
  LoginSchema,
  EmailSchema,
  TokenSchema,
  ChangePasswordSchema,
} from "../dto/dto";
import { sanitizeBody } from "../middlewares/sanitation";
import { finalActionLimiter, sendCodeLimiter, verifyCodeLimiter } from "../configs/limit";
import rateLimit from "express-rate-limit";
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

router.post(
  "/login/oauth",
  sanitizeBody,
  validateBody(TokenSchema),
  async (req: Request, res: Response) => {
    oAuth(req, res);
  }
);

//TODO: endpoints
router.post(
  "/verify-code",
  rateLimit(verifyCodeLimiter),
  async (req: Request, res: Response) => {
    checkVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forget-password/verify",
  rateLimit(finalActionLimiter),
  async (req: Request, res: Response) => {
    verifiedChangePassword(req, res);
  }
);

router.post(
  "/forget-username/verify",
  rateLimit(finalActionLimiter),
  async (req: Request, res: Response) => {
    verifiedForgetUsername(req, res);
  }
);

router.post(
  "/forget-password",
  rateLimit(sendCodeLimiter),
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    sendVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forget-username",
  rateLimit(sendCodeLimiter),
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    sendVerificationCodeEmail(req, res);
  }
);

router.post(
  "/change-password",
  sanitizeBody,
  validateBody(ChangePasswordSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    changeUserPassword(req, res);
  }
);

export default router;
