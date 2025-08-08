import { Request, Response, Router } from "express";
import { upload } from "../middlewares/upload";
import { verifyUser } from "../middlewares/verification";
import { sanitizeBody } from "../middlewares/sanitation";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validation";
import {
  MoldFolderCreateSchema,
  MoldFolderUpdateSchema,
} from "../dto/moldFolderDTO";
import { PaginationQuerySchema } from "../dto/paginationDTO";
import { MoldIdSchema } from "../dto/moldDTO";
import {
  createMoldFolder,
  getAllMoldFolders,
  getAllArchivedMoldFolders,
  patchMoldFolder,
  deleteMoldFolder,
  softDeleteMoldFolder,
} from "../controllers/moldFolderController";

const router = Router();

router.post(
  "/",
  verifyUser(),
  upload.single("photo"),
  sanitizeBody,
  validateBody(MoldFolderCreateSchema),
  async (req: Request, res: Response) => {
    await createMoldFolder(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllMoldFolders(req, res);
  }
);

router.get(
  "/archive",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response) => {
    await getAllArchivedMoldFolders(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  sanitizeBody,
  validateBody(MoldFolderUpdateSchema),
  async (req: Request, res: Response) => {
    await patchMoldFolder(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await deleteMoldFolder(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await softDeleteMoldFolder(req, res);
  }
);

export default router;
