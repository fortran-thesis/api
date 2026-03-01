/**
 * Model Proxy Routes
 *
 * Exposes the Lambda ML model API through the Firebase gateway.
 * Phase A: transparent proxy with user auth.
 * Phase B: adds Firebase Auth ID-token requirement.
 */
import {Request, Response, Router} from "express";
import {verifyUser} from "../middlewares/verification";
import {upload} from "../middlewares/upload";
import {predictJson, predictMultipart} from "../controllers/modelController";

const router = Router();

/**
 * JSON prediction – POST /api/v1/model/predict
 * Body: { image_b64: string, characteristics?: Record<string, number> }
 * Query: ?explain=true (optional)
 */
router.post(
  "/predict",
  verifyUser(),
  async (req: Request, res: Response): Promise<void> => {
    await predictJson(req, res);
  }
);

/**
 * Multipart prediction – POST /api/v1/model/predict/multipart
 * Body: multipart/form-data with `image` file field + optional characteristic fields
 * Query: ?explain=true (optional)
 */
router.post(
  "/predict/multipart",
  verifyUser(),
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    await predictMultipart(req, res);
  }
);

export default router;
