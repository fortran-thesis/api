import {Request, Response} from "express";
import {
  removeUser,
  softRemoveUser,
  updateUser,
  updateUserProfile,
} from "../services/authService";
import {devLog} from "../utils/dev";
import {uploadFiles} from "../lib/storage";
import {StorageFolder} from "../configs/storage";
import {defaultError, sendError, sendSuccess} from "../utils/response";
import {
  retrieveAllUsers,
  retrieveUserByEmail,
  retrieveUserById,
  retrieveUsersByRole, getRoleCounts, getUsersByActiveStatus, getDisabledCounts, searchAndFilterUsers} from "../services/userService";
import {APIUser, PaginatedResult, UserDetails} from "../types/types";

/**
 * Get user by ID
 *
 * @route GET /api/v1/user/{id}
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: User found, 404: User not found, 500: Server error
 * @access Authenticated users
 */
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
export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const user = await retrieveUserById(id);
    if (!user) return sendError(res, "Failed to retrieve user", 404);
    return sendSuccess(res, user);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get user by email
 *
 * @route GET /api/v1/user/email/{email}
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: User found, 404: User not found, 500: Server error
 * @access Authenticated users
 */
export const getUserByEmail = async (req: Request, res: Response) => {
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
  try {
    const email = req.params.email;
    const user = await retrieveUserByEmail(email);
    if (!user) return sendError(res, "Failed to retrieve user", 404);
    return sendSuccess(res, user);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Get all users (admin only)
 *
 * @route GET /api/v1/user
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: List of users, 403: Forbidden, 500: Server error
 * @access Admin only
 * @remarks Supports pagination via query params (?page, ?limit)
 */
export const getAllUsers = async (req: Request, res: Response) => {
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
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result: PaginatedResult<APIUser[]> | null = await retrieveAllUsers(limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve users", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
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
  try {
    const id = req.user?.id;
    if (!id) return sendError(res, "Unauthenticated", 401);
    const user = await retrieveUserById(id);
    if (!user) return sendError(res, "Failed to retrieve user", 404);
    return sendSuccess(res, user);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
export const getRoleCountsController = async (req: Request, res: Response) => {
  try {
    const counts = await getRoleCounts();
    if (!counts) return sendError(res, "Failed to retrieve role counts", 500);
    return sendSuccess(res, counts);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
export const getAllMycologists = async (req: Request, res: Response) => {
  const limit: number = parseInt(req.query.limit as string) || 10;
  const pageToken: string | undefined = req.query.pageToken as string | undefined;
  try {
    const result = await retrieveUsersByRole("mycologist", limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve mycologists", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
export const getUsersByActiveController = async (req: Request, res: Response) => {
  try {
    const activeParam = (req.query.active as string) || "true";
    const active = activeParam.toLowerCase() !== "false"; // default true
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const pageToken = (req.query.pageToken as string) || undefined;

    const result = await getUsersByActiveStatus(limit, pageToken, active);
    if (!result) return sendError(res, "Failed to retrieve users", 500);
    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * @swagger
 * /api/v1/user/counts/disabled:
 *   get:
 *     summary: Get count of disabled users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: Retrieve the count of disabled users. Requires admin role.
 *     responses:
 *       200:
 *         description: Disabled user count retrieved successfully
 *       500:
 *         description: Failed to get disabled counts
 */
export const getDisabledCountsController = async (req: Request, res: Response) => {
  try {
    const counts = await getDisabledCounts();
    if (!counts) return sendError(res, "Failed to get disabled counts", 500);
    return sendSuccess(res, counts);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


/**
 * Update user details
 *
 * @route PATCH /api/v1/user/{id}
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: Success, 400: Validation error, 403: Forbidden, 500: Server error
 * @access Authenticated users
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
export const patchUser = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    const details: UserDetails = req.body.details;
    const updated = await updateUser(id, details);
    if (!updated) {
      return sendError(res, "Failed to update user. Try again later");
    }
    return sendSuccess(res, "Successfully updated user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
 *                 description: JSON stringified object containing profile fields
 *                 example: '{"username":"johndoe","firstName":"John","lastName":"Doe","email":"john@example.com","displayName":"John Doe","address":"123 Main St","phoneNumber":"+1234567890"}'
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional profile photo file (image/jpeg, image/png, image/webp)
 *     responses:
 *       200:
 *         description: Successfully updated profile, returns updated user data
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
export const patchUserProfile = async (req: Request, res: Response) => {
  try {
    const id = req.user?.id;
    if (!id) return sendError(res, "Unauthenticated", 401);

    // Debug log (dev-only)
    devLog({
      contentType: req.headers["content-type"],
      bodyKeys: Object.keys(req.body || {}),
      hasFile: !!req.file,
      body: req.body,
    }, "patchUserProfile request details");

    const details = req.body as any;
    let uploadedPhotoPath: string | undefined;

    // Handle single photo upload (upload.single("photo") sets req.file, not req.files)
    if (req.file) {
      const uploaded = await uploadFiles([req.file], StorageFolder.USERS);
      if (!uploaded || uploaded.length === 0) return sendError(res, "Invalid photo, please upload a different image.", 400);
      uploadedPhotoPath = uploaded[0];
    }

    const profileUpdate = {
      username: details.username,
      firstName: details.firstName,
      lastName: details.lastName,
      email: details.email,
      displayName: details.displayName,
      address: details.address,
      phoneNumber: details.phoneNumber,
      photo_url: uploadedPhotoPath || details.photo_url,
    };

    devLog(profileUpdate, "patchUserProfile updateUserProfile payload");

    const updated = await updateUserProfile(id, profileUpdate);
    if (!updated) return sendError(res, "Failed to update user profile", 400);
    // Return the updated user profile
    const updatedUser = await retrieveUserById(id);
    if (!updatedUser) return sendError(res, "Failed to retrieve updated user", 500);
    return sendSuccess(res, updatedUser);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Delete user (admin only)
 *
 * @route DELETE /api/v1/user/hard/{id}
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: Success, 403: Forbidden, 500: Server error
 * @access Admin only
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
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id: string = req.params.id;
    await removeUser(id);
    return sendSuccess(res, "Successfully deleted user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

/**
 * Soft delete user
 *
 * @route DELETE /api/v1/user/soft/{id}
 * @param req - Express request object
 * @param res - Express response object
 * @returns 200: Success, 500: Server error
 * @access Authenticated users
 */
export const softDeleteUser = async (req: Request, res: Response) => {
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
  try {
    const id: string = req.params.id;
    await softRemoveUser(id);
    return sendSuccess(res, "Successfully soft deleted user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const searchQuery: string | undefined = req.query.search as string | undefined;
    const role: string | undefined = req.query.role as string | undefined;
    const statusParam: string | undefined = req.query.status as string | undefined;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const pageToken: string | undefined = req.query.pageToken as string | undefined;

    // Convert status string to boolean (undefined if not provided)
    let active: boolean | undefined;
    if (statusParam) {
      if (statusParam.toLowerCase() === "active") {
        active = true;
      } else if (statusParam.toLowerCase() === "disabled") {
        active = false;
      }
    }

    const result = await searchAndFilterUsers(searchQuery, role, active, limit, pageToken);
    if (!result) return sendError(res, "Failed to retrieve users", 500);

    return sendSuccess(res, result);
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};


