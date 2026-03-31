/**
  * @swagger
  * /api/v1/flag-report:
  *   post:
  *     summary: Create a flag report (content)
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Flag content as incorrect or inappropriate. Requires authentication.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               content_id:
  *                 type: string
  *                 description: ID of the content being flagged
  *               content_type:
  *                 type: string
  *                 description: Type of content (e.g., "mold", "moldipedia")
  *               reason:
  *                 type: string
  *                 description: Reason for flagging
  *               details:
  *                 type: string
  *                 description: Additional details
  *     responses:
  *       200:
  *         description: Successfully created flag report
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
  *                     content_id:
  *                       type: string
  *                     content_type:
  *                       type: string
  *                     reporter_id:
  *                       type: string
  *                     reason:
  *                       type: string
  *                     details:
  *                       type: string
  *                       nullable: true
  *                     status:
  *                       type: string
  *                       enum: [unresolved, resolved]
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
  * /api/v1/flag-report:
  *   get:
  *     summary: List flag reports
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: List all flag reports, paginated.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Page size
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token
  *     responses:
  *       200:
  *         description: List of flag reports
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
  *                           content_id:
  *                             type: string
  *                           content_type:
  *                             type: string
  *                           reporter_id:
  *                             type: string
  *                           reason:
  *                             type: string
  *                           details:
  *                             type: string
  *                             nullable: true
  *                           status:
  *                             type: string
  *                             enum: [unresolved, resolved]
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
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
  * /api/v1/flag-report/{id}:
  *   get:
  *     summary: Get flag report by ID
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve a flag report by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Flag report ID
  *     responses:
  *       200:
  *         description: Flag report
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
  *                     content_id:
  *                       type: string
  *                     content_type:
  *                       type: string
  *                     reporter_id:
  *                       type: string
  *                     reason:
  *                       type: string
  *                     details:
  *                       type: string
  *                       nullable: true
  *                     status:
  *                       type: string
  *                       enum: [unresolved, resolved]
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
  * /api/v1/flag-report/{id}:
  *   patch:
  *     summary: Update flag report
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Update a flag report by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Flag report ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               status:
  *                 type: string
  *                 enum: [unresolved, resolved]
  *                 description: New status
  *               details:
  *                 type: string
  *                 description: Optional details
  *     responses:
  *       200:
  *         description: Successfully updated flag report
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                   example: true
  *                 data:
  *                   type: boolean
  *                   description: Update success status
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
  * /api/v1/flag-report/hard/{id}:
  *   delete:
  *     summary: Hard delete flag report
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Hard delete a flag report by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Flag report ID
  *     responses:
  *       200:
  *         description: Successfully deleted flag report
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
  *                   example: "Successfully deleted flag report"
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
  * /api/v1/flag-report/soft/{id}:
  *   delete:
  *     summary: Soft delete flag report
  *     tags: [FlagReports]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Soft delete a flag report by its ID. Requires authentication.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Flag report ID
  *     responses:
  *       200:
  *         description: Successfully soft deleted flag report
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
  *                   example: "Successfully soft deleted flag report."
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
