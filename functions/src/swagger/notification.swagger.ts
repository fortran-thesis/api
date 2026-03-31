/**
  * @swagger
  * /api/v1/notification:
  *   get:
  *     summary: Get paginated notifications for the authenticated user
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Returns paginated notifications for the authenticated user ordered by creation date descending. Soft-deleted notifications (those with `metadata.deleted_at` set) are not excluded at the database query level and may appear in results. Clients should filter on `metadata.deleted_at` if needed.
  *
  *       `is_read` filter is applied as a Firestore `where` clause.
  *       `type` filter is applied as a Firestore `where` clause.
  *       Both filters can be combined.
  *     parameters:
  *       - in: query
  *         name: is_read
  *         schema:
  *           type: string
  *           enum: ["true", "false"]
  *         description: Filter by read status
  *       - in: query
  *         name: type
  *         schema:
  *           type: string
  *         description: Filter by notification type
  *       - in: query
  *         name: limit
  *         schema:
  *           type: string
  *           default: "20"
  *         description: Number of results per page
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Token for the next page
  *     responses:
  *       200:
  *         description: Paginated list of notifications
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/NotificationListResponse'
  *       401:
  *         description: Unauthorized
  *       500:
  *         description: Internal server error
  */

/**
  * @swagger
  * /api/v1/notification/unread-count:
  *   get:
  *     summary: Get the number of unread notifications
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     responses:
  *       200:
  *         description: Unread notification count
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/UnreadCountResponse'
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/{id}:
  *   get:
  *     summary: Get a single notification by ID
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Notification document ID
  *     responses:
  *       200:
  *         description: Notification found
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/NotificationResponse'
  *       404:
  *         description: Notification not found or not owned by user
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/{id}/read:
  *   patch:
  *     summary: Mark a notification as read
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Notification document ID
  *     responses:
  *       200:
  *         description: Notification marked as read
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseSuccess'
  *       404:
  *         description: Notification not found or not owned by user
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/read-all:
  *   patch:
  *     summary: Mark all notifications as read for the authenticated user
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     responses:
  *       200:
  *         description: All notifications marked as read
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseSuccess'
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/{id}:
  *   delete:
  *     summary: Soft-delete a notification
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Notification document ID
  *     responses:
  *       200:
  *         description: Notification deleted
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseSuccess'
  *       404:
  *         description: Notification not found or not owned by user
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/device-token:
  *   post:
  *     summary: Register an FCM device token for push notifications
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/RegisterDeviceTokenRequest'
  *     responses:
  *       200:
  *         description: Device token registered
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseSuccess'
  *       400:
  *         description: Validation error
  *       401:
  *         description: Unauthorized
  */

/**
  * @swagger
  * /api/v1/notification/device-token/{id}:
  *   delete:
  *     summary: Unregister an FCM device token
  *     tags: [Notification]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: Device token document ID
  *     responses:
  *       200:
  *         description: Device token removed
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseSuccess'
  *       400:
  *         description: Failed to remove token
  *       401:
  *         description: Unauthorized
  */
