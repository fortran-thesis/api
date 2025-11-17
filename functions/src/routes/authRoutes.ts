import {Request, Response, Router} from "express";
import {
  changeUserPassword,
  checkVerificationCodeEmail,
  createUser,
  loginUser,
  logoutUser,
  oAuth,
  sendVerificationCodeEmail,
  verifiedChangePassword,
  verifiedForgetUsername,
} from "../controllers/authController";
import {validateBody} from "../middlewares/validation";
import {
  RegisterSchema,
  LoginSchema,
  EmailSchema,
  ChangePasswordSchema,
} from "../dto/dto";
import {sanitizeBody} from "../middlewares/sanitation";
import {
  finalActionLimiter,
  sendCodeLimiter,
  verifyCodeLimiter,
} from "../configs/limit";
import {verifyDevice} from "../middlewares/deviceVerification";
import rateLimit from "express-rate-limit";
import {verifyUser} from "../middlewares/verification";

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
  verifyDevice(),
  sanitizeBody,
  validateBody(LoginSchema),
  async (req: Request, res: Response) => {
    loginUser(req, res);
  }
);

router.post(
  "/login/oauth",
  verifyDevice(),
  async (req: Request, res: Response) => {
    oAuth(req, res);
  }
);

router.post(
  "/verify-code",
  rateLimit(verifyCodeLimiter),
  async (req: Request, res: Response) => {
    checkVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forgot-password",
  rateLimit(sendCodeLimiter),
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    sendVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forgot-username",
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

router.post(
  "/logout",
  async (req: Request, res: Response) => {
    logoutUser(req, res);
  }
);

router.post(
  "/forgot-password/verify",
  rateLimit(finalActionLimiter),
  async (req: Request, res: Response) => {
    verifiedChangePassword(req, res);
  }
);

router.post(
  "/forgot-username/verify",
  rateLimit(finalActionLimiter),
  async (req: Request, res: Response) => {
    verifiedForgetUsername(req, res);
  }
);

export default router;
