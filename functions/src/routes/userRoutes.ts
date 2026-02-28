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
    await getAllUsers(req, res);
  }
);

// Search and filter users - place before dynamic routes
router.get(
  "/search",
  verifyUser(Role.ADMIN),
  validateQuery(SearchUsersQuerySchema),
  async (req: Request, res: Response) => {
    await searchUsers(req, res);
  }
);

router.get("/profile", verifyUser(), async (req: Request, res: Response) => {
  await getUserProfile(req, res);
});

// Handle PATCH with JSON body (no photo)
router.patch(
  "/profile",
  verifyUser(),
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
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
    await patchUserProfile(req, res);
  }
);

router.get(
  "/counts/roles",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    await getRoleCountsController(req, res);
  }
);

router.get(
  "/mycologists",
  verifyUser(Role.ADMIN),
  validateQuery(PaginationQuerySchema),
  cacheGet("mycologists"),
  async (req: Request, res: Response) => {
    await getAllMycologists(req, res);
  }
);

// Dynamic user by id route - keep after static routes
router.get(
  "/:id",
  verifyUser(),
  sanitizeParams,
  validateParams(UserIdSchema),
  async (req: Request, res: Response) => {
    await getUserById(req, res);
  }
);

router.get(
  "/counts/disabled",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    await getDisabledCountsController(req, res);
  }
);

router.get(
  "/filter/disabled",
  verifyUser(Role.ADMIN),
  async (req: Request, res: Response) => {
    await getUsersByActiveController(req, res);
  }
);

router.get(
  "/email/:email",
  verifyUser(),
  sanitizeParams,
  validateParams(EmailSchema),
  async (req: Request, res: Response) => {
    await getUserByEmail(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(UserIdSchema),
  sanitizeBody,
  validateBody(UserDetailsUpdateSchema),
  auditLog(AuditAction.UPDATE_USER, (req) => `Admin updated user ${req.params.id}`),
  cacheInvalidate("users", "update"),
  async (req: Request, res: Response) => {
    await patchUser(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(Role.ADMIN),
  sanitizeParams,
  validateParams(UserIdSchema),
  cacheInvalidate("users", "delete"),
  async (req: Request, res: Response) => {
    await deleteUser(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  sanitizeParams,
  validateParams(UserIdSchema),
  cacheInvalidate("users", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteUser(req, res);
  }
);

export default router;
