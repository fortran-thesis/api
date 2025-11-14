import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {Role} from "../types/enums";
import {
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserProfile,
  patchUser,
  softDeleteUser,
  getAllMycologists,
  getRoleCountsController,
  getUsersByActiveController,
  getDisabledCountsController,
  searchUsers,
} from "../controllers/userController";
import {EmailSchema, UserDetailsUpdateSchema, UserIdSchema, SearchUsersQuerySchema} from "../dto/dto";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {sanitizeBody, sanitizeParams} from "../middlewares/sanitation";

const router = Router();

router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    getAllUsers(req, res);
  }
);

// Search and filter users - place before dynamic routes
router.get(
  "/search",
  verifyUser(Role.ADMIN),
  validateQuery(SearchUsersQuerySchema),
  async (req: Request, res: Response) => {
    searchUsers(req, res);
  }
);

// NOTE: the dynamic `/:id` route is defined later to avoid catching static routes

router.get("/profile", verifyUser(), async (req: Request, res: Response) => {
  getUserProfile(req, res);
});
router.get(
  "/counts/roles",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    getRoleCountsController(req, res);
  }
);

router.get(
  "/mycologists",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    getAllMycologists(req, res);
  }
);

// Dynamic user by id route - keep after static routes so specific paths are matched first
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
  "/counts/disabled",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    getDisabledCountsController(req, res);
  }
);

router.get(
  "/filter/disabled",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    getUsersByActiveController(req, res);
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
