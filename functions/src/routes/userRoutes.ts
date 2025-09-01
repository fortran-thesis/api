import { Request, Response, Router } from "express";
import { verifyUser } from "../middlewares/verification";
import { Role } from "../types/enums";
import {
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserProfile,
  patchUser,
  softDeleteUser,
} from "../controllers/userController";
import { EmailSchema, UserDetailsUpdateSchema, UserIdSchema } from "../dto/dto";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import { PaginationQuerySchema } from "../dto/paginationDTO";
import { sanitizeBody, sanitizeParams } from "../middlewares/sanitation";

const router = Router();

router.get(
  "/profile",
  verifyUser(),
  async (req: Request, res: Response) => {
    getUserProfile(req, res);
  }
);

router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    getAllUsers(req, res);
  }
);

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
  "/hard/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    deleteUser(req, res);
  }
);

router.delete(
  "/soft/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(),
  async (req: Request, res: Response) => {
    softDeleteUser(req, res);
  }
);

export default router;
