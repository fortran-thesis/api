import {Request, Response, Router} from "express";
import {upload} from "../middlewares/upload";
import {verifyUser} from "../middlewares/verification";
import {sanitizeBody} from "../middlewares/sanitation";
import {validateQuery, validateParams} from "../middlewares/validation";
import {PaginationQuerySchema} from "../dto/paginationDTO";
import {MoldIdSchema} from "../dto/moldDTO";
import {cacheGet, cacheInvalidate} from "../middlewares/cacheMiddleware";
import {
  createMonitoredMold,
  getAllMonitoredMoldsByFolderId,
  getMonitoredMoldById,
  patchMonitoredMold,
  deleteMonitoredMold,
  softDeleteMonitoredMold,
} from "../controllers/monitoredMoldController";

const router = Router();

router.post(
  "/",
  verifyUser(),
  upload.single("photo"),
  sanitizeBody,
  cacheInvalidate("monitored-molds", "create"),
  async (req: Request, res: Response) => {
    await createMonitoredMold(req, res);
  }
);

router.get(
  "/",
  verifyUser(),
  validateQuery(PaginationQuerySchema),
  cacheGet("monitored-molds"),
  async (req: Request, res: Response) => {
    await getAllMonitoredMoldsByFolderId(req, res);
  }
);

router.get(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  async (req: Request, res: Response) => {
    await getMonitoredMoldById(req, res);
  }
);

router.patch(
  "/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  sanitizeBody,
  cacheInvalidate("monitored-molds", "update"),
  async (req: Request, res: Response) => {
    await patchMonitoredMold(req, res);
  }
);

router.delete(
  "/hard/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("monitored-molds", "delete"),
  async (req: Request, res: Response) => {
    await deleteMonitoredMold(req, res);
  }
);

router.delete(
  "/soft/:id",
  verifyUser(),
  validateParams(MoldIdSchema),
  cacheInvalidate("monitored-molds", "delete"),
  async (req: Request, res: Response) => {
    await softDeleteMonitoredMold(req, res);
  }
);

export default router;
