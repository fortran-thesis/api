/**
  * @swagger
  * /api/v1/system-request:
  *   post:
  *     summary: Create a new system request (feedback or bug report)
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Submit feedback or report a bug. Requires authentication.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - type
  *               - message
  *             properties:
  *               type:
  *                 type: string
  *                 enum: [feedback, bug]
  *                 description: Type of system request
  *               message:
  *                 type: string
  *                 description: Message content
  *               user_id:
  *                 type: string
  *                 description: Optional user ID
  *     responses:
  *       200:
  *         description: Successfully created system request
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
  *                     id:
  *                       type: string
  *                     type:
  *                       type: string
  *                       enum: [feedback, bug]
  *                     message:
  *                       type: string
  *                     user_id:
  *                       type: string
  *                     created_at:
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
  * /api/v1/system-request:
  *   get:
  *     summary: Get all system requests
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all system requests (feedback and bug reports) with pagination. Admin only.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *           default: 10
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of system requests
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
  *                           type:
  *                             type: string
  *                             enum: [feedback, bug]
  *                           message:
  *                             type: string
  *                           userId:
  *                             type: string
  *                           created_at:
  *                             type: string
  *                             format: date-time
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       404:
  *         description: Not found
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
  * /api/v1/system-request/{id}:
  *   get:
  *     summary: Get system request by ID
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve a system request by its ID. Admin only.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: System request ID
  *     responses:
  *       200:
  *         description: System request retrieved successfully
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
  *                     id:
  *                       type: string
  *                     type:
  *                       type: string
  *                       enum: [feedback, bug]
  *                     message:
  *                       type: string
  *                     userId:
  *                       type: string
  *                     created_at:
  *                       type: string
  *                       format: date-time
  *       404:
  *         description: Not found
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
  * /api/v1/system-request/{id}:
  *   patch:
  *     summary: Update system request
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Update a system request by its ID. Admin only. Params validated via SystemRequestIdSchema (20-char Firestore ID), body validated via SystemRequestUpdateSchema.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *           minLength: 20
  *           maxLength: 20
  *           pattern: '^[A-Za-z0-9_-]+$'
  *         description: System request ID (20-character Firestore auto-ID)
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               message:
  *                 type: string
  *                 description: Updated message
  *               type:
  *                 type: string
  *                 enum: [feedback, bug]
  *                 description: Updated type
  *               userId:
  *                 type: string
  *                 description: Updated user ID
  *     responses:
  *       200:
  *         description: Successfully updated system request
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
  *                     id:
  *                       type: string
  *                     type:
  *                       type: string
  *                       enum: [feedback, bug]
  *                     message:
  *                       type: string
  *                     userId:
  *                       type: string
  *                     created_at:
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
  *       404:
  *         description: Not found
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
  * /api/v1/system-request/hard/{id}:
  *   delete:
  *     summary: Hard delete system request
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Hard delete a system request by its ID. Admin only. Params validated via SystemRequestIdSchema (20-char Firestore ID).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *           minLength: 20
  *           maxLength: 20
  *           pattern: '^[A-Za-z0-9_-]+$'
  *         description: System request ID (20-character Firestore auto-ID)
  *     responses:
  *       200:
  *         description: Successfully deleted system request
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: string
  *                   example: "Successfully deleted system request"
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
  * /api/v1/system-request/soft/{id}:
  *   delete:
  *     summary: Soft delete system request
  *     tags: [SystemRequest]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Soft delete a system request by its ID. Admin only. Params validated via SystemRequestIdSchema (20-char Firestore ID).
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *           minLength: 20
  *           maxLength: 20
  *           pattern: '^[A-Za-z0-9_-]+$'
  *         description: System request ID (20-character Firestore auto-ID)
  *     responses:
  *       200:
  *         description: Successfully soft deleted system request
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: string
  *                   example: "Successfully soft deleted system request."
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
