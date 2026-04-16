import {Request, Response, Router} from "express";
import {rateLimit} from "express-rate-limit";
import {verifyUser} from "../middlewares/verification";
import {lookupMolds} from "../controllers/lookupController";
import {lookupLimiter} from "../configs/limit";

const router = Router();

/**
 * POST /api/v1/lookup
 * Perform mold lookup by symptoms/signs/characteristics
 */
router.post(
  "/",
  verifyUser(),
  rateLimit(lookupLimiter),
  async (req: Request, res: Response) => {
    await lookupMolds(req, res);
  }
);

export default router;
