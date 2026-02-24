import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as authService from "../../../src/services/authService";
import {getAuth} from "firebase-admin/auth";
import {Role} from "../../../src/types/enums";

const mockCreateUser = jest.fn() as jest.MockedFunction<any>;
const mockGetUser = jest.fn() as jest.MockedFunction<any>;
const mockGetUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockUpdateUser = jest.fn() as jest.MockedFunction<any>;
const mockDeleteUser = jest.fn() as jest.MockedFunction<any>;
const mockVerifySessionCookie = jest.fn() as jest.MockedFunction<any>;
const mockVerifyIdToken = jest.fn() as jest.MockedFunction<any>;
const mockRevokeRefreshTokens = jest.fn() as jest.MockedFunction<any>;
const mockAddUser = jest.fn() as jest.MockedFunction<any>;
const mockUpdateFirestoreUser = jest.fn() as jest.MockedFunction<any>;
const mockDeleteFirestoreUser = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteFirestoreUser = jest.fn() as jest.MockedFunction<any>;
const mockHandlePostCache = jest.fn() as jest.MockedFunction<any>;
const mockHandlePatchCache = jest.fn() as jest.MockedFunction<any>;
const mockHandleDeleteCache = jest.fn() as jest.MockedFunction<any>;
const mockRedisGet = jest.fn() as jest.MockedFunction<any>;
const mockRedisSet = jest.fn() as jest.MockedFunction<any>;
const mockRedisDel = jest.fn() as jest.MockedFunction<any>;
const mockGetAuthUserByEmail = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/utils/dev");
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));
jest.mock("../../../src/repositories/userRepository", () => ({
  addUser: (...args: any[]) => mockAddUser(...args),
  updateFirestoreUser: (...args: any[]) => mockUpdateFirestoreUser(...args),
  deleteFirestoreUser: (...args: any[]) => mockDeleteFirestoreUser(...args),
  softDeleteFirestoreUser: (...args: any[]) => mockSoftDeleteFirestoreUser(...args),
}));
jest.mock("../../../src/lib/auth", () => ({
  getAuthUserByEmail: (...args: any[]) => mockGetAuthUserByEmail(...args),
}));
jest.mock("../../../src/utils/email");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/cacheManager", () => ({
  handlePostCache: (...args: any[]) => mockHandlePostCache(...args),
  handlePatchCache: (...args: any[]) => mockHandlePatchCache(...args),
  handleDeleteCache: (...args: any[]) => mockHandleDeleteCache(...args),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  },
  redisReady: Promise.resolve(),
  ensureRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

describe("authService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({
      createUser: mockCreateUser,
      getUser: mockGetUser,
      getUserByEmail: mockGetUserByEmail,
      updateUser: mockUpdateUser,
      deleteUser: mockDeleteUser,
      verifySessionCookie: mockVerifySessionCookie,
      verifyIdToken: mockVerifyIdToken,
      revokeRefreshTokens: mockRevokeRefreshTokens,
    });
  });

  describe("registerUser", () => {
    it("should register user successfully", async () => {
      mockGetUserByEmail.mockRejectedValue({code: "auth/user-not-found"});
      mockCreateUser.mockResolvedValue({uid: "user123"});
      mockAddUser.mockResolvedValue({id: "user123"});
      mockHandlePostCache.mockResolvedValue(undefined);

      const result = await authService.registerUser(
        "testuser",
        "test@example.com",
        "password123",
        "John",
        "Doe",
        "123 Main St",
        undefined,
        Role.USER
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully created user!");
      expect(mockCreateUser).toHaveBeenCalled();
      expect(mockAddUser).toHaveBeenCalled();
    });

    it("should return error if email already exists", async () => {
      mockGetUserByEmail.mockResolvedValue({uid: "existing"});

      const result = await authService.registerUser(
        "testuser",
        "test@example.com",
        "password123",
        "John",
        "Doe",
        "123 Main St"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email already used!");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const mockAuthUser = {
        id: "user123",
        user: {username: "test"},
        details: {email: "test@example.com"},
      };
      mockGetAuthUserByEmail.mockResolvedValue(mockAuthUser);
      mockUpdateUser.mockResolvedValue(true);

      // Mock ensureRedisConnection to return the mocked redis instance
      const mockRedisInstance = {
        get: jest.fn().mockResolvedValue("test@example.com"),
        del: jest.fn().mockResolvedValue(1),
      };
      jest.spyOn(require("../../../src/configs/redis"), "ensureRedisConnection").mockResolvedValue(mockRedisInstance);

      const result = await authService.changePassword("token123", "newPass123");

      expect(result.success).toBe(true);
      expect(result.data).toBe("Password changed successfully!");
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockRedisInstance.del).toHaveBeenCalledWith("token:token123");
    });

    it("should return error for invalid token", async () => {
      // Mock ensureRedisConnection to return the mocked redis instance with null email
      const mockRedisInstance = {
        get: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(require("../../../src/configs/redis"), "ensureRedisConnection").mockResolvedValue(mockRedisInstance);

      const result = await authService.changePassword("invalid", "newPass123");

      expect(result.success).toBe(false);
      expect(result.data).toBe("Invalid or expired token!");
    });
  });

  describe("logoutUserSession", () => {
    it("should revoke tokens using session cookie", async () => {
      mockVerifySessionCookie.mockResolvedValue({uid: "user123"});
      mockRevokeRefreshTokens.mockResolvedValue(undefined);

      const result = await authService.logoutUserSession("sessionCookie");

      expect(result).toBe(true);
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith("user123");
    });

    it("should revoke tokens using ID token", async () => {
      mockVerifySessionCookie.mockRejectedValue(new Error("Invalid"));
      mockVerifyIdToken.mockResolvedValue({uid: "user123"});
      mockRevokeRefreshTokens.mockResolvedValue(undefined);

      const result = await authService.logoutUserSession(undefined, "idToken");

      expect(result).toBe(true);
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith("user123");
    });

    it("should return false when both tokens invalid", async () => {
      mockVerifySessionCookie.mockRejectedValue(new Error("Invalid"));
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid"));

      const result = await authService.logoutUserSession("bad", "bad");

      expect(result).toBe(false);
    });
  });

  describe("softRemoveUser", () => {
    it("should soft delete user", async () => {
      mockUpdateUser.mockResolvedValue(true);
      mockSoftDeleteFirestoreUser.mockResolvedValue(true);

      await authService.softRemoveUser("user123");

      expect(mockUpdateUser).toHaveBeenCalledWith("user123", {disabled: true});
      expect(mockSoftDeleteFirestoreUser).toHaveBeenCalledWith("user123");
      // Cache invalidation is handled by route middleware, not the service
    });
  });

  describe("updateUserProfile", () => {
    it("should normalize phone number and update both Auth and Firestore", async () => {
      mockUpdateUser.mockResolvedValue(true);
      mockUpdateFirestoreUser.mockResolvedValue(true);

      const result = await authService.updateUserProfile("user123", { phoneNumber: "09171234567" });

      expect(result).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith("user123", expect.objectContaining({ phoneNumber: "+639171234567" }));
      expect(mockUpdateFirestoreUser).toHaveBeenCalledWith("user123", expect.objectContaining({ phone_number: "+639171234567" }));
    });
  });

  describe("removeUser", () => {
    it("should hard delete user", async () => {
      mockDeleteUser.mockResolvedValue(true);
      mockDeleteFirestoreUser.mockResolvedValue(true);

      await authService.removeUser("user123");

      expect(mockDeleteUser).toHaveBeenCalledWith("user123");
      expect(mockDeleteFirestoreUser).toHaveBeenCalledWith("user123");
      // Cache invalidation is handled by route middleware, not the service
    });
  });
});
