/**
  * @swagger
  * /api/v1/admin/disable:
  *   post:
  *     summary: Disable a user
  *     tags: [Admin]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie) and admin role.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               id:
  *                 type: string
  *                 description: User ID
  *     responses:
  *       200:
  *         description: Successfully disabled user
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
  *                   example: "Successfully disabled user."
  *       400:
  *         description: Error
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
  *                   example: "Failed to disable user."
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/admin/enable:
  *   post:
  *     summary: Enable a user
  *     tags: [Admin]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie) and admin role.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               id:
  *                 type: string
  *                 description: User ID
  *     responses:
  *       200:
  *         description: Successfully enabled user
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
  *                   example: "Successfully enabled user."
  *       400:
  *         description: Error
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
  *                   example: "Failed to enable user."
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/admin/ban:
  *   post:
  *     summary: Ban a user
  *     tags: [Admin]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie) and admin role.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               id:
  *                 type: string
  *                 description: User ID
  *     responses:
  *       200:
  *         description: Successfully banned user
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
  *                   example: "Successfully banned user."
  *       400:
  *         description: Error
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
  *                   example: "Failed to ban user."
  *       500:
  *         description: Server error
  */
