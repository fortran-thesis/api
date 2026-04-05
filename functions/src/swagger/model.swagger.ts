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
