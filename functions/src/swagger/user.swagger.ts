/**
  * @swagger
  * /api/v1/user/{id}:
  *   get:
  *     summary: Get user by ID
  *     tags: [Users]
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: User ID
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     responses:
  *       200:
  *         description: User found
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
  *                     username:
  *                       type: string
  *                     email:
  *                       type: string
  *                     role:
  *                       type: string
  *                     is_active:
  *                       type: boolean
  *       404:
  *         description: User not found
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/user/email/{email}:
  *   get:
  *     summary: Get user by email
  *     tags: [Users]
  *     parameters:
  *       - in: path
  *         name: email
  *         required: true
  *         schema:
  *           type: string
  *         description: User email
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     responses:
  *       200:
  *         description: User found
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
  *                     username:
  *                       type: string
  *                     email:
  *                       type: string
  *                     role:
  *                       type: string
  *                     is_active:
  *                       type: boolean
  *       404:
  *         description: User not found
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/user:
  *   get:
  *     summary: Get all users (admin only)
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie) and admin role.
  *     responses:
  *       200:
  *         description: List of users
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/PaginatedResult'
  *       403:
  *         description: Forbidden
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 error:
  *                   type: string
  */

/**
  * @swagger
  * /api/v1/user/profile:
  *   get:
  *     summary: Get authenticated user's profile
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     responses:
  *       200:
  *         description: User found
  *       404:
  *         description: User not found
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/user/counts/roles:
  *   get:
  *     summary: Get user counts by role
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve counts of users grouped by role. Requires admin role.
  *     responses:
  *       200:
  *         description: Role counts retrieved successfully
  *       500:
  *         description: Failed to retrieve role counts
  */

/**
  * @swagger
  * /api/v1/user/mycologists:
  *   get:
  *     summary: Get all mycologists
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve all users with mycologist role. Requires admin role.
  *     parameters:
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of mycologists
  *       500:
  *         description: Failed to retrieve mycologists
  */

/**
  * @swagger
  * /api/v1/user/filter/disabled:
  *   get:
  *     summary: Get users filtered by active/disabled status
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Retrieve users filtered by their active/disabled status. Requires admin role.
  *     parameters:
  *       - in: query
  *         name: active
  *         schema:
  *           type: boolean
  *         description: Filter by active status (default true)
  *       - in: query
  *         name: limit
  *         schema:
  *           type: integer
  *         description: Number of items per page (default 10)
  *       - in: query
  *         name: pageToken
  *         schema:
  *           type: string
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: List of filtered users
  *       500:
  *         description: Failed to retrieve users
  */

/**
  * @swagger
  * /api/v1/user/counts/disabled:
  *   get:
  *     summary: Get count of disabled users
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Counts active and disabled users by iterating all Firebase Auth records in pages of 1000. This is an unbounded scan — response time scales with total user count. Results are not cached. Restrict access accordingly.
  *     responses:
  *       200:
  *         description: Disabled user count retrieved successfully
  *       500:
  *         description: Failed to get disabled counts
  */

/**
  * @swagger
  * /api/v1/user/{id}:
  *   patch:
  *     summary: Update user details
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: User ID
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               details:
  *                 type: object
  *                 description: User details to update
  *     responses:
  *       200:
  *         description: Successfully updated user
  *       400:
  *         description: Validation error
  *       403:
  *         description: Forbidden
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/user/profile:
  *   patch:
  *     summary: Update authenticated user's profile
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: Update the authenticated user's profile (username, name, email, address, phone, photo_url). Requires authentication.
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             properties:
  *               details:
  *                 type: string
  *                 description: JSON-encoded string containing any subset of the profile fields below. Promoted to root body by parseMultipartJson middleware.
  *                 example: '{"username":"johndoe","firstName":"John","lastName":"Doe","email":"john@example.com","displayName":"John Doe","address":"123 Main St","phoneNumber":"+1234567890"}'
  *               username:
  *                 type: string
  *               firstName:
  *                 type: string
  *               lastName:
  *                 type: string
  *               email:
  *                 type: string
  *                 format: email
  *               displayName:
  *                 type: string
  *               address:
  *                 type: string
  *               phoneNumber:
  *                 type: string
  *                 description: Philippine numbers are normalized to E.164 (+63...) before storage. Pass any local format (09XX, 639XX, +639XX).
  *               photo:
  *                 type: string
  *                 format: binary
  *                 description: Optional image file (JPEG or PNG). Uploaded to Firebase Storage and stored as photoURL in Firebase Auth only — NOT written to the Firestore user document.
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/UserProfileUpdateRequest'
  *     responses:
  *       200:
  *         description: Profile updated. `details.photo_url` is a signed URL with a 2-hour TTL derived from Firebase Auth's photoURL. It is not stored in Firestore.
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
  *                       example: "user123"
  *                     user:
  *                       type: object
  *                       properties:
  *                         username:
  *                           type: string
  *                         first_name:
  *                           type: string
  *                         last_name:
  *                           type: string
  *                         address:
  *                           type: string
  *                         role:
  *                           type: string
  *                           enum: [farmer, mycologist, admin]
  *                         is_banned:
  *                           type: boolean
  *                     details:
  *                       type: object
  *                       properties:
  *                         email:
  *                           type: string
  *                         displayName:
  *                           type: string
  *                         photo_url:
  *                           type: string
  *                           nullable: true
  *                         disabled:
  *                           type: boolean
  *                         phone_number:
  *                           type: string
  *       400:
  *         description: Validation error or failed to update
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
  *       401:
  *         description: Unauthorized - missing or invalid authentication
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
  * /api/v1/user/hard/{id}:
  *   delete:
  *     summary: Delete user (admin only)
  *     tags: [Users]
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: User ID
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie) and admin role.
  *     responses:
  *       200:
  *         description: Successfully deleted user
  *       403:
  *         description: Forbidden
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/user/soft/{id}:
  *   delete:
  *     summary: Soft delete user
  *     tags: [Users]
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *         description: User ID
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     responses:
  *       200:
  *         description: Successfully soft deleted user
  *       500:
  *         description: Server error
  */

/**
  * @swagger
  * /api/v1/user/search:
  *   get:
  *     summary: Search and filter users
  *     tags: [Users]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description: |
  *       Search and filter users by multiple criteria. All parameters are optional.
  *       Requires admin role.
  *     parameters:
  *       - in: query
  *         name: search
  *         schema:
  *           type: string
  *         description: Search term for username, email, first name, or last name
  *       - in: query
  *         name: role
  *         schema:
  *           type: string
  *         description: Filter by user role (e.g., 'farmer', 'mycologist', 'curator', 'admin')
  *       - in: query
  *         name: status
  *         schema:
  *           type: string
  *           enum: [active, disabled]
  *         description: Filter by account status (active or disabled)
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
  *         description: Cursor token for pagination
  *     responses:
  *       200:
  *         description: Filtered and searched user list
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
  *                     nextPageToken:
  *                       type: string
  *                       nullable: true
  *       400:
  *         description: Invalid query parameters
  *       500:
  *         description: Failed to retrieve users
  */
