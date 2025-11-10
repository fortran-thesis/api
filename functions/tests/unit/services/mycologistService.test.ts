import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as mycologistService from "../../../src/services/mycologistService";
import * as authService from "../../../src/services/authService";
import {getAuth} from "firebase-admin/auth";
import {Role} from "../../../src/types/enums";

// Mock dependencies
jest.mock("../../../src/services/authService");
jest.mock("../../../src/utils/dev");
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    getUserByEmail: jest.fn(),
  })),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe("mycologistService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerMycologist", () => {
    it("should successfully register a mycologist", async () => {
      const mockRequest = {
        username: "mycologist123",
        email: "mycologist@example.com",
        password: "SecurePass123!",
        first_name: "John",
        last_name: "Doe",
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        data: "Mycologist registered successfully",
      });

      const mockGetUserByEmail = jest.fn() as jest.MockedFunction<
        (email: string) => Promise<{uid: string}>
      >;
      mockGetUserByEmail.mockResolvedValue({
        uid: "user-123",
      });
      const mockAuth = {
        getUserByEmail: mockGetUserByEmail,
      };
      mockGetAuth.mockReturnValue(mockAuth as any);

      const result = await mycologistService.registerMycologist(mockRequest);

      expect(result).toBeDefined();
      expect(result?.userId).toBe("user-123");
      expect(result?.message).toContain("successfully");
      expect(mockAuthService.registerUser).toHaveBeenCalledWith(
        mockRequest.username,
        mockRequest.email,
        mockRequest.password,
        mockRequest.first_name,
        mockRequest.last_name,
        "", // empty address for mycologist
        undefined, // optional phoneNumber
        Role.CURATOR // mycologist role
      );
    });

    it("should return null when registration fails", async () => {
      const mockRequest = {
        username: "mycologist123",
        email: "mycologist@example.com",
        password: "SecurePass123!",
        first_name: "John",
        last_name: "Doe",
      };

      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: "Registration failed",
      });

      const result = await mycologistService.registerMycologist(mockRequest);

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const mockRequest = {
        username: "mycologist123",
        email: "mycologist@example.com",
        password: "SecurePass123!",
        first_name: "John",
        last_name: "Doe",
      };

      mockAuthService.registerUser.mockRejectedValue(
        new Error("Database error")
      );

      const result = await mycologistService.registerMycologist(mockRequest);

      expect(result).toBeNull();
    });
  });
});
