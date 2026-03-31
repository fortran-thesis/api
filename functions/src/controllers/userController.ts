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
  try {
    const id: string = req.params.id;
    await softRemoveUser(id);
    return sendSuccess(res, "Successfully soft deleted user.");
  } catch (error) {
    devLog(error);
    return defaultError(res);
  }
};

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

