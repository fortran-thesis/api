/**
  * @swagger
  * /api/v1/auth/register:
  *   post:
  *     summary: Register a new user
  *     tags: [Auth]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/RegisterRequest'
  *     responses:
  *       200:
  *         description: Successfully created user
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
  *                   example: "Successfully created user!"
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
  *                   example: "Email already used!"
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
  *                   example: "Registration failed"
  */

/**
  * @swagger
  * /api/v1/auth/login:
  *   post:
  *     summary: Login user
  *     tags: [Auth]
  *     parameters:
  *       - in: query
  *         name: device
  *         schema:
  *           type: string
  *           enum: [mobile, website]
  *         description: Explicit device type override. If omitted, device is inferred from X-Device-Type header, then User-Agent. Farmers may only log in from `mobile`; admins and mycologists may only log in from `website`. Mismatched device/role returns 403.
  *       - in: header
  *         name: X-Device-Type
  *         schema:
  *           type: string
  *           enum: [mobile, website]
  *         description: Alternative to the `device` query param.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/LoginRequest'
  *     responses:
  *       200:
  *         description: Successfully logged in
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
  *                   example: "Successfully logged in!"
  *       400:
  *         description: Incorrect credentials
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseError'
  *       403:
  *         description: Role is not permitted to access this application from the detected device type. Farmers must use `device=mobile`; admins and mycologists must use `device=website`.
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
  * /api/v1/auth/oauth:
  *   post:
  *     summary: OAuth2 login/register
  *     tags: [Auth]
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - token
  *             properties:
  *               token:
  *                 type: string
  *                 description: OAuth ID token from the provider
  *     responses:
  *       200:
  *         description: Successfully logged in
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
  *                   example: "Successfully logged in!"
  *       400:
  *         description: Invalid OAuth token or registration failed
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseError'
  *       403:
  *         description: Role not permitted
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
  * /api/v1/auth/logout:
  *   post:
  *     summary: Logout user
  *     tags: [Auth]
  *     description: Verifies the session cookie or Bearer token, revokes Firebase refresh tokens for the corresponding user, then clears the session cookie on the client. Returns 401 if neither credential is present.
  *     responses:
  *       200:
  *         description: Successfully logged out
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
  *                   example: "Successfully logged out!"
  *       401:
  *         description: No session cookie or Bearer token provided.
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/ApiResponseError'
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
  * /api/v1/auth/send-verification:
  *   post:
  *     summary: Send verification code to email
  *     tags: [Auth]
  *     description:
  *       - Public endpoint to send verification code.
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/EmailRequest'
  *     responses:
  *       200:
  *         description: Verification code sent
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
  *                   example: "Verification code sent to email"
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
  * /api/v1/auth/check-verification:
  *   post:
  *     summary: Check verification code
  *     tags: [Auth]
  *     description: Validate a verification code sent to email. Now validated via VerificationCodeSchema (email + code required).
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/VerificationCodeRequest'
  *     responses:
  *       200:
  *         description: Verification code valid
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
  *                   description: Verification token (UUID)
  *                   example: "550e8400-e29b-41d4-a716-446655440000"
  *       400:
  *         description: Invalid code or validation error
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
  * /api/v1/auth/verified-change-password:
  *   post:
  *     summary: Change password with verification
  *     tags: [Auth]
  *     description: Change password after email verification. Now validated via VerifiedChangePasswordSchema (token + newPassword required, password rules enforced).
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/VerifiedChangePasswordRequest'
  *     responses:
  *       200:
  *         description: Password changed
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
  *                   example: "Successfully changed password!"
  *       400:
  *         description: Verification token is invalid, expired (30-minute TTL), or no user exists for the associated email. All cases return the message "Invalid code!".
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
  * /api/v1/auth/verified-forget-username:
  *   post:
  *     summary: Send username to email after verification
  *     tags: [Auth]
  *     description: Send username to email after email verification. Now validated via TokenSchema (token required).
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/TokenRequest'
  *     responses:
  *       200:
  *         description: Username sent
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
  *                   example: "Successfully sent email to show username!"
  *       400:
  *         description: Invalid token or validation error
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
  * /api/v1/auth/change-password:
  *   post:
  *     summary: Change password (authenticated)
  *     tags: [Auth]
  *     security:
  *       - bearerAuth: []
  *       - cookieAuth: []
  *     description:
  *       - Requires authentication (Bearer token or session cookie)
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/ChangePasswordRequest'
  *     responses:
  *       200:
  *         description: Password changed
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
  *                   example: "Successfully changed password!"
  *       400:
  *         description: Wrong credentials
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
  *                   example: "Wrong credentials"
  *       401:
  *         description: Not authenticated
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
  *                   example: "User not authenticated properly."
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
