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
  OAuthSchema,
  TokenSchema,
  VerificationCodeSchema,
  VerifiedChangePasswordSchema,
} from "../dto/dto";
import {sanitizeBody} from "../middlewares/sanitation";
import {
  finalActionLimiter,
  sendCodeLimiter,
  verifyCodeLimiter,
} from "../configs/limit";
import {verifyDevice} from "../middlewares/deviceVerification";
import {rateLimit} from "express-rate-limit";
import {verifyUser} from "../middlewares/verification";
import {cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.post(
  "/register",
  sanitizeBody,
  validateBody(RegisterSchema),
  cacheInvalidate("users", "create"),
  async (req: Request, res: Response) => {
    await createUser(req, res);
  }
);

router.post(
  "/login",
  verifyDevice(),
  sanitizeBody,
  validateBody(LoginSchema),
  async (req: Request, res: Response) => {
    await loginUser(req, res);
  }
);

router.post(
  "/login/oauth",
  verifyDevice(),
  validateBody(OAuthSchema),
  async (req: Request, res: Response) => {
    await oAuth(req, res);
  }
);

router.post(
  "/verify-code",
  rateLimit(verifyCodeLimiter),
  sanitizeBody,
  validateBody(VerificationCodeSchema),
  async (req: Request, res: Response) => {
    await checkVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forgot-password",
  rateLimit(sendCodeLimiter),
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    await sendVerificationCodeEmail(req, res);
  }
);

router.post(
  "/forgot-username",
  rateLimit(sendCodeLimiter),
  sanitizeBody,
  validateBody(EmailSchema),
  async (req: Request, res: Response) => {
    await sendVerificationCodeEmail(req, res);
  }
);

router.post(
  "/change-password",
  verifyUser(),
  sanitizeBody,
  validateBody(ChangePasswordSchema),
  async (req: Request, res: Response) => {
    await changeUserPassword(req, res);
  }
);

router.post(
  "/logout",
  async (req: Request, res: Response) => {
    await logoutUser(req, res);
  }
);

router.post(
  "/forgot-password/verify",
  rateLimit(finalActionLimiter),
  sanitizeBody,
  validateBody(VerifiedChangePasswordSchema),
  async (req: Request, res: Response) => {
    await verifiedChangePassword(req, res);
  }
);

router.post(
  "/forgot-username/verify",
  rateLimit(finalActionLimiter),
  sanitizeBody,
  validateBody(TokenSchema),
  async (req: Request, res: Response) => {
    await verifiedForgetUsername(req, res);
  }
);

export default router;
