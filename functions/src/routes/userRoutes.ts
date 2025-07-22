import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";
import {
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  patchUser,
} from "../controllers/userController";
import { EmailSchema, UserDetailsUpdateSchema, UserIdSchema } from "../dto/dto";
import { validateBody, validateParams } from "../middlewares/validation";
import { sanitizeBody, sanitizeParams } from "../middlewares/sanitation";

const router = Router();

router.get("/", verifyUser(Role.ADMIN), async (req: Request, res: Response) => {
  getAllUsers(req, res);
});

router.get(
  "/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    getUserById(req, res);
  }
);

router.get(
  "/email/:email",
  sanitizeParams,
  validateParams(EmailSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    getUserByEmail(req, res);
  }
);

router.patch(
  "/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  sanitizeBody,
  validateBody(UserDetailsUpdateSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    patchUser(req, res);
  }
);

router.delete(
  "/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    deleteUser(req, res);
  }
);

export default router;
