/**
  * @swagger
  * /api/v1/monitor:
  *   post:
  *     summary: Create a new monitored mold
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Create a new monitored mold with image upload. Requires authentication.
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             required:
  *               - details
  *               - photo
  *             properties:
  *               details:
  *                 type: string
  *                 description: JSON stringified object containing monitored mold fields (e.g. moldipedia_id, user_id, location, notes)
  *                 example: '{"moldipedia_id":"mold123","user_id":"user123","location":"Greenhouse A","notes":"Initial monitoring"}'
  *               photo:
  *                 type: string
  *                 format: binary
  *     responses:
  *       200:
  *         description: Successfully created monitored mold
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     moldipedia_id:
  *                       type: string
  *                     user_id:
  *                       type: string
  *                     location:
  *                       type: string
  *                     image_url:
  *                       type: string
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     notes:
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
  *         description: Invalid photo or validation error
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/monitor:
  *   get:
  *     summary: Get all monitored molds by folder ID
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all monitored molds for a specific folder with pagination. Requires authentication.
  *     parameters:
  *       - in: query
  *         name: folderId
  *         required: true
  *         schema:
  *           type: string
  *         description: Folder ID to filter by
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *     responses:
  *       200:
  *         description: List of monitored molds
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     snapshot:
  *                       type: array
  *                       items:
  *                         type: object
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *                       description: Opaque cursor token for fetching the next page. Pass as the `pageToken` query parameter in the next request. Null when no further pages exist. The internal format is base64-encoded JSON and must be treated as opaque.
  *       404:
  *         description: Failed to retrieve monitored molds
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/monitor/{id}:
  *   get:
  *     summary: Get monitored mold by ID
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve a specific monitored mold by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Monitored mold ID
  *     responses:
  *       200:
  *         description: Monitored mold retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 data:
  *                   type: object
  *                   properties:
  *                     id:
  *                       type: string
  *                     moldipedia_id:
  *                       type: string
  *                     user_id:
  *                       type: string
  *                     location:
  *                       type: string
  *                     image_url:
  *                       type: string
  *                       description: Signed Google Cloud Storage URL. Valid for 2 hours from the time of the response. Do not cache this URL beyond that window.
  *                     notes:
  *                       type: string
  *                     is_active:
  *                       type: boolean
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *                     updated_at:
  *                       type: string
  *                       format: date-time
  *       404:
  *         description: Monitored mold not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/monitor/{id}:
  *   patch:
  *     summary: Update monitored mold
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Update a monitored mold's details by ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Monitored mold ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               details:
  *                 type: object
  *                 description: Monitored mold details to update
  *     responses:
  *       200:
  *         description: Successfully updated monitored mold
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
  *         description: Monitored mold not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/monitor/hard/{id}:
  *   delete:
  *     summary: Hard delete monitored mold
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Permanently delete a monitored mold by ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Monitored mold ID
  *     responses:
  *       200:
  *         description: Successfully deleted monitored mold
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
  * /api/v1/monitor/soft/{id}:
  *   delete:
  *     summary: Soft delete monitored mold
  *     tags: [MonitoredMolds]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Soft delete a monitored mold by marking it as archived. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Monitored mold ID
  *     responses:
  *       200:
  *         description: Successfully soft deleted monitored mold
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
