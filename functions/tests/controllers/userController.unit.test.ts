import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as userController from "../../src/controllers/userController";
import * as userService from "../../src/services/userService";
import * as authService from "../../src/services/authService";
import * as responseUtils from "../../src/utils/response";
import {Role} from "../../src/types/enums";

// Mock all external dependencies
jest.mock("../../src/services/userService");
jest.mock("../../src/services/authService");
jest.mock("../../src/utils/response");
jest.mock("../../src/utils/dev");
jest.mock("../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));
jest.mock("../../src/lib/storage");

const mockUserService = userService as jest.Mocked<typeof userService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;
const mockStorage = require("../../src/lib/storage") as any;

describe("userController (unit)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis() as unknown as (
        code: number
      ) => Response,
      json: jest.fn() as unknown as Response["json"],
    };

    // Mock response utilities to return values
    mockResponseUtils.sendSuccess.mockReturnValue(undefined as any);
    mockResponseUtils.sendError.mockReturnValue(undefined as any);
    mockResponseUtils.defaultError.mockReturnValue(undefined as any);
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      const userId = "test-user-id";
      const mockUser = {
        id: userId,
        user: {
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        },
        details: {
          email: "test@example.com",
          emailVerified: true,
        },
      };

      mockReq.params = {id: userId};
      mockUserService.retrieveUserById.mockResolvedValue(mockUser as any);

      await userController.getUserById(mockReq as Request, mockRes as Response);

      expect(mockUserService.retrieveUserById).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        mockUser
      );
    });

    it("should return 404 when user not found", async () => {
      const userId = "nonexistent-user";
      mockReq.params = {id: userId};
      mockUserService.retrieveUserById.mockResolvedValue(null);

      await userController.getUserById(mockReq as Request, mockRes as Response);

      expect(mockUserService.retrieveUserById).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes as any,
        "Failed to retrieve user",
        404
      );
    });

    it("should handle service errors", async () => {
      const userId = "test-user-id";
      mockReq.params = {id: userId};
      mockUserService.retrieveUserById.mockRejectedValue(
        new Error("Service error")
      );

      await userController.getUserById(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(
        mockRes as any
      );
    });
  });

  describe("getUserByEmail", () => {
    it("should return user when found by email", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "test-user-id",
        user: {
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        },
        details: {
          email,
          emailVerified: true,
        },
      };

      mockReq.params = {email};
      mockUserService.retrieveUserByEmail.mockResolvedValue(mockUser as any);

      await userController.getUserByEmail(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockUserService.retrieveUserByEmail).toHaveBeenCalledWith(email);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        mockUser
      );
    });

    it("should return 404 when user not found by email", async () => {
      const email = "nonexistent@example.com";
      mockReq.params = {email};
      mockUserService.retrieveUserByEmail.mockResolvedValue(null);

      await userController.getUserByEmail(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockUserService.retrieveUserByEmail).toHaveBeenCalledWith(email);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes as any,
        "Failed to retrieve user",
        404
      );
    });
  });

  describe("getAllUsers", () => {
    it("should return paginated users with default parameters", async () => {
      const mockPaginatedResult = {
        snapshot: [
          {
            id: "user1",
            user: {username: "user1", role: Role.USER, is_banned: false},
            details: {email: "user1@example.com"},
          },
          {
            id: "user2",
            user: {username: "user2", role: Role.USER, is_banned: false},
            details: {email: "user2@example.com"},
          },
        ],
        nextPageToken: null,
      };

      mockReq.query = {};
      mockUserService.retrieveAllUsers.mockResolvedValue(
        mockPaginatedResult as any
      );

      await userController.getAllUsers(mockReq as Request, mockRes as Response);

      expect(mockUserService.retrieveAllUsers).toHaveBeenCalledWith(
        10,
        undefined
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        mockPaginatedResult
      );
    });

    it("should use custom limit and pageToken", async () => {
      const mockPaginatedResult = {
        snapshot: [],
        nextPageToken: null,
      };

      mockReq.query = {limit: "5", pageToken: "token123"};
      mockUserService.retrieveAllUsers.mockResolvedValue(
        mockPaginatedResult as any
      );

      await userController.getAllUsers(mockReq as Request, mockRes as Response);

      expect(mockUserService.retrieveAllUsers).toHaveBeenCalledWith(
        5,
        "token123"
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        mockPaginatedResult
      );
    });

    it("should return 404 when no users found", async () => {
      mockReq.query = {};
      mockUserService.retrieveAllUsers.mockResolvedValue(null);

      await userController.getAllUsers(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes as any,
        "Failed to retrieve users",
        500
      );
    });
  });

  describe("patchUser", () => {
    it("should successfully update user", async () => {
      const userId = "test-user-id";
      const updateData = {username: "newusername"};

      mockReq.params = {id: userId};
      mockReq.body = {details: updateData};
      mockAuthService.updateUser.mockResolvedValue(true);

      await userController.patchUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.updateUser).toHaveBeenCalledWith(
        userId,
        updateData as any
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        "Successfully updated user."
      );
    });

    it("should return error when update fails", async () => {
      const userId = "test-user-id";
      const updateData = {username: "newusername"};

      mockReq.params = {id: userId};
      mockReq.body = {details: updateData};
      mockAuthService.updateUser.mockResolvedValue(false);

      await userController.patchUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.updateUser).toHaveBeenCalledWith(
        userId,
        updateData as any
      );
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes as any,
        "Failed to update user. Try again later"
      );
    });
  });

  describe("patchUserProfile", () => {
    beforeEach(() => {
      // Reset storage mock before each test
      (mockStorage.uploadFiles as any).mockReset();
    });

    it("should successfully update profile with photo uploaded", async () => {
      const userId = "test-user-id";
      const details = { firstName: "Karl" };
      const files = [{ originalname: "pic.jpg", buffer: Buffer.from("test") }] as any;
      
      (mockReq as any).user = { id: userId } as any;
      mockReq.body = details;
      (mockReq as any).files = files;
      (mockReq as any).headers = { "content-type": "multipart/form-data" };

      (mockStorage.uploadFiles as any).mockResolvedValue(["users/123_pic.jpg"]);
      mockAuthService.updateUserProfile.mockResolvedValue(true);
      const updatedUser = { id: userId, user: { username: "karl" }, details: { email: "karl@test", photo_url: "https://signed.url" } };
      mockUserService.retrieveUserById.mockResolvedValue(updatedUser as any);

      await userController.patchUserProfile(mockReq as Request, mockRes as Response);

      expect(mockStorage.uploadFiles).toHaveBeenCalledWith(
        files,
        expect.any(String)
      );
      expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith(userId, expect.objectContaining({ photo_url: "users/123_pic.jpg" }));
      expect(mockUserService.retrieveUserById).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes as any, updatedUser);
    });

    it("should return 400 when update fails", async () => {
      const userId = "test-user-id";
      (mockReq as any).user = { id: userId } as any;
      mockReq.body = { firstName: "Karl" };
      (mockReq as any).files = undefined;
      (mockReq as any).headers = {};

      mockAuthService.updateUserProfile.mockResolvedValue(false);

      await userController.patchUserProfile(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(mockRes as any, "Failed to update user profile", 400);
    });
  });

  describe("softDeleteUser", () => {
    it("should successfully soft delete user", async () => {
      const userId = "test-user-id";

      mockReq.params = {id: userId};
      mockAuthService.softRemoveUser.mockResolvedValue(undefined);

      await userController.softDeleteUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockAuthService.softRemoveUser).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        "Successfully soft deleted user."
      );
    });

    it("should handle soft delete errors", async () => {
      const userId = "test-user-id";

      mockReq.params = {id: userId};
      mockAuthService.softRemoveUser.mockRejectedValue(
        new Error("Soft delete failed")
      );

      await userController.softDeleteUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockAuthService.softRemoveUser).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(
        mockRes as any
      );
    });
  });

  describe("deleteUser", () => {
    it("should successfully delete user", async () => {
      const userId = "test-user-id";

      mockReq.params = {id: userId};
      mockAuthService.removeUser.mockResolvedValue(undefined);

      await userController.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.removeUser).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes as any,
        "Successfully deleted user."
      );
    });

    it("should handle delete errors", async () => {
      const userId = "test-user-id";

      mockReq.params = {id: userId};
      mockAuthService.removeUser.mockRejectedValue(new Error("Delete failed"));

      await userController.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.removeUser).toHaveBeenCalledWith(userId);
      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(
        mockRes as any
      );
    });
  });
});
