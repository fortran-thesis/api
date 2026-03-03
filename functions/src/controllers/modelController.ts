/**
 * Model Proxy Controller
 *
 * Thin controller that delegates to modelProxyService.
 */
import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {proxyJsonPredict, proxyMultipartPredict} from "../services/modelProxyService";

/**
 * POST /api/v1/model/predict (JSON)
 *
 * Accepts { image_b64, characteristics? } and proxies to Lambda /v2/predict.
 */
export const predictJson = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.image_b64) {
      return res.status(400).json({success: false, error: "image_b64 is required"});
    }

    const queryParams: Record<string, string> = {};
    if (req.query.explain) {
      queryParams.explain = String(req.query.explain);
    }

    const result = await proxyJsonPredict(payload, queryParams);
    return res.status(result.status).json(result.body);
  } catch (err) {
    devLog(err, "modelController:predictJson");
    return res.status(500).json({success: false, error: "Internal server error"});
  }
};

/**
 * POST /api/v1/model/predict/multipart
 *
 * Accepts multipart/form-data with an `image` file field and optional
 * characteristics, then proxies to Lambda /default/multimodal-prediction.
 */
export const predictMultipart = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({success: false, error: "image file is required"});
    }

    // Collect non-file form fields as characteristics
    const formFields: Record<string, string> = {};
    if (req.body && typeof req.body === "object") {
      for (const [k, v] of Object.entries(req.body)) {
        if (typeof v === "string") {
          formFields[k] = v;
        }
      }
    }

    const queryParams: Record<string, string> = {};
    if (req.query.explain) {
      queryParams.explain = String(req.query.explain);
    }

    const result = await proxyMultipartPredict(file, formFields, queryParams);
    return res.status(result.status).json(result.body);
  } catch (err) {
    devLog(err, "modelController:predictMultipart");
    return res.status(500).json({success: false, error: "Internal server error"});
  }
};
