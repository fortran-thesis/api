import { Request, Response, Router } from "express";
import { createUser, loginUser } from "../controllers/authController";
import { validateBody } from "../middlewares/validation";
import { RegisterSchema, LoginSchema } from "../dto/dto";

const router = Router();

router.post(
  "/register",
  validateBody(RegisterSchema),
  async (req: Request, res: Response) => {
    createUser(req, res);
  }
);
router.post(
  "/login",
  validateBody(LoginSchema),
  async (req: Request, res: Response) => {
    loginUser(req, res);
  }
);

export default router;
