import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";
import { validateBody } from "../middlewares/validation";
import { RegisterMycologistSchema } from "../dto/mycologistDTO";
import { registerMycologistController } from "../controllers/mycologistController";
import { sanitizeBody } from "../middlewares/sanitation";

const router = Router();

router.post(
  "/register",
  verifyUser(Role.ADMIN),
  sanitizeBody,
  validateBody(RegisterMycologistSchema),
  async (req: Request, res: Response) => {
    await registerMycologistController(req, res);
  }
);

export default router;
