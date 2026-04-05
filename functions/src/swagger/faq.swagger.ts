/**
  * @swagger
  * /api/v1/faq:
  *   post:
  *     summary: Create a new FAQ
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Create a new FAQ entry. Requires curator or admin role.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - question
  *               - answer
  *               - user_id
  *             properties:
  *               question:
  *                 type: string
  *               answer:
  *                 type: string
  *               user_id:
  *                 type: string
  *     responses:
  *       200:
  *         description: FAQ created successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                 data:
  *                   type: object
  *       400:
  *         description: Validation error
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/faq:
  *   get:
  *     summary: Get all FAQ entries with optional search
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve FAQ entries with optional search by question/answer and pagination.
  *     parameters:
  *       - in: query
  *         name: search
  *         schema:
  *           type: string
  *         description: Search query for question or answer
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *           default: 10
  *         description: Number of items per page
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Pagination token
  *     responses:
  *       200:
  *         description: FAQs retrieved successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                 data:
  *                   type: array
  *                 nextPageToken:
  *                   type: string
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/faq/{id}:
  *   get:
  *     summary: Get FAQ by ID
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: FAQ ID
  *     responses:
  *       200:
  *         description: FAQ found
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *       404:
  *         description: FAQ not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/faq/{id}:
  *   patch:
  *     summary: Update FAQ
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               question:
  *                 type: string
  *               answer:
  *                 type: string
  *     responses:
  *       200:
  *         description: FAQ updated successfully
  *       404:
  *         description: FAQ not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/faq/hard/{id}:
  *   delete:
  *     summary: Delete FAQ permanently
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: FAQ deleted successfully
  *       400:
  *         description: Failed to delete FAQ
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/faq/soft/{id}:
  *   delete:
  *     summary: Soft delete FAQ
  *     tags: [FAQ]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: FAQ soft deleted successfully
  *       400:
  *         description: Failed to soft delete FAQ
  *       500:
  *         description: Server error
  */
