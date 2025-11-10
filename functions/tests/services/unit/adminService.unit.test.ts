import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {getAuth} from "firebase-admin/auth";
import * as adminService from "../../../src/services/adminService";
import * as userRepository from "../../../src/repositories/userRepository";
import * as emailUtils from "../../../src/utils/email";
import {Role} from "../../../src/types/enums";

// Mock all external dependencies
jest.mock("firebase-admin/auth");
jest.mock("../../../src/repositories/userRepository");
jest.mock("../../../src/utils/email");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockEmailUtils = emailUtils as jest.Mocked<typeof emailUtils>;

describe("adminService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("toggleUser", () => {
    it("should successfully enable a disabled user", async () => {
      const userId = "test-user-id";
      const email = "test@example.com";
      const mockUser = {
        uid: userId,
        disabled: false,
      };

      const mockUpdateUser = jest.fn().mockResolvedValue(mockUser);
      mockGetAuth.mockReturnValue({
        updateUser: mockUpdateUser,
      } as any);

      mockEmailUtils.sendEmail.mockResolvedValue(undefined);

      const result = await adminService.toggleUser(userId, email, false);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully disabled user.");
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, {disabled: false});
      expect(mockEmailUtils.sendEmail).toHaveBeenCalledWith(
        email,
        "Your account has been disabled",
        expect.stringContaining("disabled")
      );
    });

    it("should successfully disable an enabled user", async () => {
      const userId = "test-user-id";
      const email = "test@example.com";
      const mockUser = {
        uid: userId,
        disabled: true,
      };

      const mockUpdateUser = jest.fn().mockResolvedValue(mockUser);
      mockGetAuth.mockReturnValue({
        updateUser: mockUpdateUser,
      } as any);

      mockEmailUtils.sendEmail.mockResolvedValue(undefined);

      const result = await adminService.toggleUser(userId, email, true);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully enabled user.");
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, {disabled: true});
      expect(mockEmailUtils.sendEmail).toHaveBeenCalledWith(
        email,
        "Your account has been enabled",
        expect.stringContaining("enabled")
      );
    });

    it("should handle user update failure", async () => {
      const userId = "test-user-id";
      const email = "test@example.com";

      const mockUpdateUser = jest
        .fn()
        .mockRejectedValue(new Error("Update failed"));
      mockGetAuth.mockReturnValue({
        updateUser: mockUpdateUser,
      } as any);

      const result = await adminService.toggleUser(userId, email, true);

      expect(result.success).toBe(false);
      expect(result.data).toBe("Something went wrong.");
    });
  });

  describe("banUser", () => {
    it("should successfully ban a user", async () => {
      const userId = "test-user-id";
      const email = "test@example.com";

      const mockUserDoc = {
        id: userId,
        data: jest.fn().mockReturnValue({
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        }),
        exists: true,
      };

      mockUserRepository.findFirestoreUserById.mockResolvedValue(
        mockUserDoc as any
      );
      mockUserRepository.updateFirestoreUser.mockResolvedValue({} as any);
      mockEmailUtils.sendEmail.mockResolvedValue(undefined);

      const result = await adminService.banUser(userId, email);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully banned user.");
      expect(mockUserRepository.findFirestoreUserById).toHaveBeenCalledWith(
        userId
      );
      expect(mockUserRepository.updateFirestoreUser).toHaveBeenCalledWith(
        userId,
        {is_banned: true}
      );
      expect(mockEmailUtils.sendEmail).toHaveBeenCalledWith(
        email,
        "Your account has been banned",
        expect.stringContaining("banned")
      );
    });

    it("should return error if user not found", async () => {
      const userId = "nonexistent-user";
      const email = "test@example.com";

      mockUserRepository.findFirestoreUserById.mockResolvedValue(null);

      const result = await adminService.banUser(userId, email);

      expect(result.success).toBe(false);
      expect(result.data).toBe("Something went wrong.");
    });

    it("should handle ban update failure", async () => {
      const userId = "test-user-id";
      const email = "test@example.com";

      const mockUserDoc = {
        id: userId,
        data: jest.fn().mockReturnValue({
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        }),
        exists: true,
      };

      mockUserRepository.findFirestoreUserById.mockResolvedValue(
        mockUserDoc as any
      );
      mockUserRepository.updateFirestoreUser.mockResolvedValue(null);

      const result = await adminService.banUser(userId, email);

      expect(result.success).toBe(false);
      expect(result.data).toBe("Something went wrong.");
    });
  });

  describe("approveCurator", () => {
    it("should successfully approve a curator", async () => {
      const userId = "test-user-id";
      const isApproved = true;

      const mockUserDoc = {
        id: userId,
        data: jest.fn().mockReturnValue({
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        }),
        exists: true,
      };

      mockUserRepository.findFirestoreUserById.mockResolvedValue(
        mockUserDoc as any
      );
      mockUserRepository.updateFirestoreUser.mockResolvedValue({} as any);

      const result = await adminService.approveCurator(userId, isApproved);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully approved curator");
      expect(mockUserRepository.findFirestoreUserById).toHaveBeenCalledWith(
        userId
      );
      expect(mockUserRepository.updateFirestoreUser).toHaveBeenCalledWith(
        userId,
        {is_verified: true}
      );
    });

    it("should handle curator update failure", async () => {
      const userId = "test-user-id";
      const isApproved = true;

      const mockUserDoc = {
        id: userId,
        data: jest.fn().mockReturnValue({
          username: "testuser",
          role: Role.USER,
          is_banned: false,
        }),
        exists: true,
      };

      mockUserRepository.findFirestoreUserById.mockResolvedValue(
        mockUserDoc as any
      );
      mockUserRepository.updateFirestoreUser.mockResolvedValue(null);

      const result = await adminService.approveCurator(userId, isApproved);

      expect(result.success).toBe(false);
      expect(result.data).toBe("Something went wrong.");
    });
  });
});
