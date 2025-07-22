import { Request, Response, Router } from "express";
import { createUser, loginUser } from "../controllers/authController";
import { validateBody } from "../middlewares/validation";
import { RegisterSchema, LoginSchema } from "../dto/dto";
import { sanitizeBody } from "../middlewares/sanitation";

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
router.post('/change-password', async (req: Request, res: Response) => {})

router.post('/reset-password', async (req: Request, res: Response) => {})

router.post('/verify-email', async (req: Request, res: Response) => {})

export default router;
