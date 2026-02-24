import {Request, Response, Router, NextFunction} from "express";
import {verifyUser} from "../middlewares/verification";
import {parseMultipartJson} from "../middlewares/parseMultipartJson";
import {Role, AuditAction} from "../types/enums";
import {auditLog} from "../middlewares/auditLogger";
import {
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserProfile,
  patchUser,
  patchUserProfile,
  softDeleteUser,
  getAllMycologists,
  getRoleCountsController,
  getUsersByActiveController,
  getDisabledCountsController,
  searchUsers,
} from "../controllers/userController";
import {EmailSchema, UserDetailsUpdateSchema, UserIdSchema, SearchUsersQuerySchema, UserProfileUpdateSchema} from "../dto/dto";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {sanitizeBody, sanitizeParams} from "../middlewares/sanitation";
import {upload} from "../middlewares/upload";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";

const router = Router();

router.get(
  "/",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  cacheGet("users"),
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

// Handle PATCH with JSON body (no photo)
router.patch(
  "/profile",
  verifyUser(),
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
    // Only apply multipart middleware if Content-Type is multipart/form-data
    if (contentType.includes("multipart")) {
      return upload.single("photo")(req, res, next);
    }
    next();
  },
  parseMultipartJson(["details"]),
  sanitizeBody,
  validateBody(UserProfileUpdateSchema),
  auditLog(AuditAction.PROFILE_UPDATE, "Updated own profile"),
  async (req: Request, res: Response) => {
    patchUserProfile(req, res);
  }
);
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
  cacheGet("mycologists"),
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
  verifyUser(Role.ADMIN),
  auditLog(AuditAction.UPDATE_USER, (req) => `Admin updated user ${req.params.id}`),
  cacheInvalidate("users", "update"),
  async (req: Request, res: Response) => {
    patchUser(req, res);
  }
);

router.delete(
  "/hard/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(Role.ADMIN),
  cacheInvalidate("users", "delete"),
  async (req: Request, res: Response) => {
    deleteUser(req, res);
  }
);

router.delete(
  "/soft/:id",
  sanitizeParams,
  validateParams(UserIdSchema),
  verifyUser(),
  cacheInvalidate("users", "delete"),
  async (req: Request, res: Response) => {
    softDeleteUser(req, res);
  }
);

export default router;
