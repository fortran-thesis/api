import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {lookupMolds} from "../controllers/lookupController";

const router = Router();

/**
 * POST /api/v1/lookup
 * Perform mold lookup by symptoms/signs/characteristics
 */
router.post(
  "/",
  verifyUser(),
  async (req: Request, res: Response) => {
    await lookupMolds(req, res);
  }
);

export default router;
