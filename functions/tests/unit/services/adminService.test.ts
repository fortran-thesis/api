import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as adminService from "../../../src/services/adminService";
import {getAuth} from "firebase-admin/auth";

// Create mock functions at module level with proper typing
const mockUpdateUser = jest.fn() as jest.MockedFunction<any>;
const mockFindFirestoreUserById = jest.fn() as jest.MockedFunction<any>;
const mockUpdateFirestoreUser = jest.fn() as jest.MockedFunction<any>;
const mockSendEmail = jest.fn() as jest.MockedFunction<any>;
const mockHandlePatchCache = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/utils/dev");
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));
jest.mock("../../../src/repositories/userRepository", () => ({
  findFirestoreUserById: (...args: any[]) => mockFindFirestoreUserById(...args),
  updateFirestoreUser: (...args: any[]) => mockUpdateFirestoreUser(...args),
}));
jest.mock("../../../src/utils/email", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));
jest.mock("../../../src/utils/cacheManager", () => ({
  handlePatchCache: (...args: any[]) => mockHandlePatchCache(...args),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("adminService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({
      updateUser: mockUpdateUser,
    });
  });

  describe("toggleUser", () => {
    it("should disable user successfully", async () => {
      mockUpdateUser.mockResolvedValue({disabled: true});
      mockSendEmail.mockResolvedValue(undefined);
      mockHandlePatchCache.mockResolvedValue(undefined);

      const result = await adminService.toggleUser(
        "user123",
        "test@example.com",
        true
      );

      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith("user123", {disabled: true});
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockHandlePatchCache).toHaveBeenCalledWith("users", "user123", true);
    });

    it("should return error on auth failure", async () => {
      mockUpdateUser.mockRejectedValue(new Error("Auth failed"));

      const result = await adminService.toggleUser(
        "user123",
        "test@example.com",
        true
      );

      expect(result.success).toBe(false);
      expect(result.data).toBe("Something went wrong.");
    });
  });

  describe("banUser", () => {
    it("should ban user successfully", async () => {
      mockFindFirestoreUserById.mockResolvedValue({
        exists: true,
        data: () => ({email: "test@example.com"}),
      });
      mockUpdateFirestoreUser.mockResolvedValue(true);
      mockSendEmail.mockResolvedValue(undefined);
      mockHandlePatchCache.mockResolvedValue(undefined);

      const result = await adminService.banUser("user123", "test@example.com");

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully banned user.");
      expect(mockUpdateFirestoreUser).toHaveBeenCalledWith("user123", {
        is_banned: true,
      });
    });

    it("should return error when user not found", async () => {
      mockFindFirestoreUserById.mockResolvedValue(null);

      const result = await adminService.banUser("user123", "test@example.com");

      expect(result.success).toBe(false);
    });
  });

  describe("approveCurator", () => {
    it("should approve curator successfully", async () => {
      mockFindFirestoreUserById.mockResolvedValue({
        exists: true,
        data: () => ({email: "curator@example.com"}),
      });
      mockUpdateFirestoreUser.mockResolvedValue(true);
      mockSendEmail.mockResolvedValue(undefined);
      mockHandlePatchCache.mockResolvedValue(undefined);

      const result = await adminService.approveCurator("curator123", true);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully approved curator");
      expect(mockUpdateFirestoreUser).toHaveBeenCalledWith("curator123", {
        is_verified: true,
      });
    });
  });

  describe("rejectCurator", () => {
    it("should reject curator successfully", async () => {
      mockFindFirestoreUserById.mockResolvedValue({
        exists: true,
        data: () => ({email: "curator@example.com"}),
      });
      mockUpdateFirestoreUser.mockResolvedValue(true);
      mockSendEmail.mockResolvedValue(undefined);
      mockHandlePatchCache.mockResolvedValue(undefined);

      const result = await adminService.rejectCurator("curator123", false);

      expect(result.success).toBe(true);
      expect(result.data).toBe("Successfully rejected curator");
      expect(mockUpdateFirestoreUser).toHaveBeenCalledWith("curator123", {
        is_verified: false,
      });
    });
  });
});
