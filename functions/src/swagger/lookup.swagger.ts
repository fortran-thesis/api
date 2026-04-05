/**
  * @swagger
  * /api/v1/lookup:
  *   post:
  *     summary: Perform keyword-based mold lookup
  *     tags: [Lookup]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Accepts symptom/sign/characteristic arrays and returns ranked mold matches.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               symptoms:
  *                 type: array
  *                 items: {type: string}
  *               reported_symptoms:
  *                 type: array
  *                 items: {type: string}
  *               signs:
  *                 type: array
  *                 items: {type: string}
  *               reported_signs:
  *                 type: array
  *                 items: {type: string}
  *               characteristics:
  *                 type: array
  *                 items: {type: string}
  *               reported_characteristics:
  *                 type: array
  *                 items: {type: string}
  *               reported_mold_names:
  *                 type: array
  *                 items: {type: string}
  *             description: >
  *               At least one non-empty array among symptoms/signs/characteristics
  *               (or their reported_* aliases) is required. reported_mold_names is
  *               optional; it adds mold identifiers from microscopic results to
  *               improve lookup confidence.
  *     responses:
  *       200:
  *         description: Lookup results
  *       400:
  *         description: Validation error
  *       500:
  *         description: Server error
  */
