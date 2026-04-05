/**
  * @swagger
  * /api/v1/scan:
  *   post:
  *     summary: Create a new scanned mold
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Create a new scanned mold with image upload. Requires authentication (Bearer token or session cookie).
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - image_format
  *               - scan_modality
  *               - source_flow
  *               - scanned_results
  *               - photo
  *             properties:
  *               image_format:
  *                 type: string
  *               scan_modality:
  *                 type: string
  *                 enum: [microscopic, macroscopic]
  *               source_flow:
  *                 type: string
  *                 enum: [identification, monitoring_initial, cultivation_log]
  *               source_tab:
  *                 type: string
  *                 enum: [in-vivo, in-vitro]
  *               user_id:
  *                 type: string
  *               mold_id:
  *                 type: string
  *               predicted_class_name:
  *                 type: string
  *               mold_case_id:
  *                 type: string
  *               captured_at:
  *                 type: string
  *                 format: date-time
  *               scanned_results:
  *                 type: object
  *                 required:
  *                   - confidence_score
  *                   - flagged
  *                 properties:
  *                   confidence_score:
  *                     type: number
  *                   flagged:
  *                     type: boolean
  *               photo:
  *                 type: string
  *                 format: binary
  *     responses:
  *       200:
  *         description: Successfully created scanned mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: object
  *                   properties:
  *                     image_url:
  *                       type: string
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     id:
  *                       type: string
  *                     moldipedia_id:
  *                       type: string
  *                     user_id:
  *                       type: string
  *                     is_active:
  *                       type: boolean
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       400:
  *         description: Validation error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: false
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: false
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/scan:
  *   get:
  *     summary: Get all scanned molds
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all scanned molds with pagination. Requires authentication. Query validated via PaginationQuerySchema.
  *     parameters:
  *       - in: query
  *         name: page
  *         schema:
  *           type: string
  *           default: "1"
  *         description: Page number (default 1)
  *       - in: query
  *         name: limit
  *         schema:
  *           type: string
  *           default: "10"
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *       - in: query
  *         name: mold_case_id
  *         schema:
  *           type: string
  *         description: Optional filter to return only scans linked to a specific mold case.
  *       - in: query
  *         name: scan_modality
  *         schema:
  *           type: string
  *           enum: [microscopic, macroscopic]
  *         description: Optional filter by scan modality.
  *     responses:
  *       200:
  *         description: List of scanned molds
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           id:
  *                             type: string
  *                           moldipedia_id:
  *                             type: string
  *                           user_id:
  *                             type: string
  *                           image_url:
  *                             type: string
  *                             description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                           is_active:
  *                             type: boolean
  *                           created_at:
  *                             type: string
  *                             format: date-time
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *       404:
  *         description: Not found
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseError'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseError'
  */

/**
  * @swagger
  * /api/v1/scan/{id}:
  *   get:
  *     summary: Get scanned mold by ID
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Scanned mold ID
  *     responses:
  *       200:
  *         description: Scanned mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     image_url:
  *                       type: string
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *       404:
  *         description: Not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/scan/{id}:
  *   patch:
  *     summary: Update scanned mold
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Update a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Scanned mold ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               details:
  *                 type: object
  *                 description: Scanned mold details to update
  *     responses:
  *       200:
  *         description: Successfully updated scanned mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *       400:
  *         description: Validation error
  *       404:
  *         description: Not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/scan/hard/{id}:
  *   delete:
  *     summary: Hard delete scanned mold
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Hard delete a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Scanned mold ID
  *     responses:
  *       200:
  *         description: Successfully deleted scanned mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/scan/soft/{id}:
  *   delete:
  *     summary: Soft delete scanned mold
  *     tags: [ScannedMold]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Soft delete a scanned mold by its ID. Requires authentication (Bearer token or session cookie).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Scanned mold ID
  *     responses:
  *       200:
  *         description: Successfully soft deleted scanned mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: string
  *       500:
  *         description: Server error
  */
