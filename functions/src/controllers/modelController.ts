/**
 * Model Proxy Controller
 *
 * Thin controller that delegates to modelProxyService.
 */
import {Request, Response} from "express";
import {devLog} from "../utils/dev";
import {proxyJsonPredict, proxyMultipartPredict} from "../services/modelProxyService";
import {retrieveMoldByPredictedClassName} from "../services/moldService";
import {sendSuccess} from "../utils/response";

/**
 * POST /api/v1/model/predict (JSON)
 *
 * Accepts { image_b64, characteristics? } and proxies to Lambda /v2/predict.
 */
/**
 * @swagger
 * /api/v1/model/predict:
 *   post:
 *     summary: Run model prediction using JSON payload
 *     tags: [Model]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_b64]
 *             properties:
 *               image_b64: {type: string, description: Base64-encoded image bytes.}
 *               characteristics: {type: object, additionalProperties: true}
 *     responses:
 *       200: {description: Prediction result}
 *       400: {description: image_b64 is required}
 *       500: {description: Server error}
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
/**
 * @swagger
 * /api/v1/model/predict/multipart:
 *   post:
 *     summary: Run model prediction using multipart form data
 *     tags: [Model]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               characteristics:
 *                 type: string
 *                 description: Optional text characteristics fields.
 *     responses:
 *       200: {description: Prediction result}
 *       400: {description: image file is required}
 *       500: {description: Server error}
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
/**
 * POST /api/v1/model/predict-with-details (JSON)
 *
 * Combined endpoint: predicts mold class and retrieves matching mold details from CMS.
 * Accepts { image_b64, characteristics? } and returns:
 *   {
 *     fusion: {...},
 *     class_probabilities: [{class_name, probability}, ...],
 *     probable_molds: [{mold_detail, confidence}, ...],  // sorted by confidence descending
 *     mold_detail: {...} || null,  // top result (legacy field)
 *     _model_source: {...}
 *   }
 */
/**
 * @swagger
 * /api/v1/model/predict-with-details:
 *   post:
 *     summary: Predict mold class and enrich with mold details
 *     tags: [Model]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_b64]
 *             properties:
 *               image_b64: {type: string}
 *               characteristics: {type: object, additionalProperties: true}
 *     responses:
 *       200: {description: Combined prediction and mold detail response}
 *       400: {description: image_b64 is required}
 *       500: {description: Server error}
 */
export const predictWithDetails = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.image_b64) {
      return res.status(400).json({success: false, error: "image_b64 is required"});
    }

    const queryParams: Record<string, string> = {};
    if (req.query.explain) {
      queryParams.explain = String(req.query.explain);
    }

    // Step 1: Get prediction from model
    const predictionResult = await proxyJsonPredict(payload, queryParams);
    if (predictionResult.status !== 200) {
      return res.status(predictionResult.status).json(predictionResult.body);
    }

    const predictionBody = predictionResult.body as any;
    const classProbabilities = predictionBody?.class_probabilities || [];

    // Step 2: Sort class probabilities by confidence descending and look up top molds
    const sortedProbs = (classProbabilities as Array<any>)
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 5); // Top 5 probable classes

    const probableMolds: Array<{mold_detail: any; confidence: number}> = [];

    for (const prob of sortedProbs) {
      const className = prob.class_name || prob.predicted_class_name;
      const confidence = prob.probability || 0;

      if (className) {
        const mold = await retrieveMoldByPredictedClassName(className);
        if (mold) {
          probableMolds.push({mold_detail: mold, confidence});
        }
      }
    }

    // Step 3: Top result for legacy compatibility
    const topMoldDetail = probableMolds.length > 0 ? probableMolds[0].mold_detail : null;

    // Return combined response with all probable molds
    return sendSuccess(res, {
      fusion: predictionBody.fusion,
      class_probabilities: classProbabilities,
      probable_molds: probableMolds,
      mold_detail: topMoldDetail,
      _model_source: predictionBody._model_source,
    });
  } catch (err) {
    devLog(err, "modelController:predictWithDetails");
    return res.status(500).json({success: false, error: "Internal server error"});
  }
};
