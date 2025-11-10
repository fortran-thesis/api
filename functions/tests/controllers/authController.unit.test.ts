import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import * as authController from "../../src/controllers/authController";
import * as authService from "../../src/services/authService";
import * as responseUtils from "../../src/utils/response";
import * as emailUtils from "../../src/utils/email";
import getAuth from "firebase-admin/auth";

// Mock all external dependencies
jest.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    updateUser: jest.fn<(a: any) => Promise<any>>().mockResolvedValue({}),
  }),
}));
jest.mock("../../src/services/authService");
jest.mock("../../src/utils/response");
jest.mock("../../src/utils/dev");
jest.mock("../../src/utils/email.ts");
jest.mock("../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));
jest.mock("../../src/configs/environment", () => ({
  envOptions: {
    isProd: false,
    maxSessionAge: 3600000,
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;
const mockEmailUtils = emailUtils as jest.Mocked<typeof emailUtils>;

describe("authController (unit)", () => {
  let mockReq: Partial<Request> & { user?: any };
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
    } as Partial<Request> as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      // Add any other Response methods you use in your tests here
    } as unknown as Response;

    // Mock response utilities
    mockResponseUtils.sendSuccess.mockReturnValue(undefined as any);
    mockResponseUtils.sendError.mockReturnValue(undefined as any);
    mockResponseUtils.defaultError.mockReturnValue(undefined as any);
  });

  describe("createUser", () => {
    it("should successfully register a new user", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const mockResult = {
        success: true,
        data: "Successfully created user!",
      };

      mockReq.body = userData;
      mockAuthService.registerUser.mockResolvedValue(mockResult as any);

      await authController.createUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith(
        userData.username,
        userData.email,
        userData.password
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockResult.data
      );
    });

    it("should return error when registration fails", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const mockResult = {
        success: false,
        error: "Email already used!",
      };

      mockReq.body = userData;
      mockAuthService.registerUser.mockResolvedValue(mockResult as any);

      await authController.createUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith(
        userData.username,
        userData.email,
        userData.password
      );
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        mockResult.error
      );
    });

    it("should handle service errors", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      mockReq.body = userData;
      mockAuthService.registerUser.mockRejectedValue(
        new Error("Service error")
      );

      await authController.createUser(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(mockRes);
    });
  });

  describe("loginUser", () => {
    it("should successfully login user", async () => {
      const loginData = {
        username: "testuser",
        password: "password123",
      };

      const mockToken = "mock-id-token";
      const mockCookie = "mock-session-cookie";

      mockReq.body = loginData;
      mockAuthService.identifyUser.mockResolvedValue(mockToken);
      mockAuthService.authenticateUser.mockResolvedValue(mockCookie);

      await authController.loginUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.identifyUser).toHaveBeenCalledWith(
        loginData.username,
        loginData.password
      );
      expect(mockAuthService.authenticateUser).toHaveBeenCalledWith(mockToken);
      expect(mockRes.cookie).toHaveBeenCalledWith("session", mockCookie, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 3600000,
      });
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        "Successfully logged in!"
      );
    });

    it("should return error when credentials are incorrect", async () => {
      const loginData = {
        username: "testuser",
        password: "wrongpassword",
      };

      mockReq.body = loginData;
      mockAuthService.identifyUser.mockResolvedValue(null);

      await authController.loginUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.identifyUser).toHaveBeenCalledWith(
        loginData.username,
        loginData.password
      );
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Incorrect credentials"
      );
    });

    it("should return error when authentication fails", async () => {
      const loginData = {
        username: "testuser",
        password: "password123",
      };

      const mockToken = "mock-id-token";

      mockReq.body = loginData;
      mockAuthService.identifyUser.mockResolvedValue(mockToken);
      mockAuthService.authenticateUser.mockResolvedValue(null);

      await authController.loginUser(mockReq as Request, mockRes as Response);

      expect(mockAuthService.identifyUser).toHaveBeenCalledWith(
        loginData.username,
        loginData.password
      );
      expect(mockAuthService.authenticateUser).toHaveBeenCalledWith(mockToken);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Incorrect credentials"
      );
    });
  });

  describe("changeUserPassword", () => {
    it("should successfully change password", async () => {
      const passwordData = {
        oldPassword: "oldpass123",
        newPassword: "newpass123",
      };

      const mockUser = {
        id: "test-user-id",
        details: {email: "test@example.com"},
      };

      const mockResult = {
        success: true,
        data: "Successfully changed password!",
      };

      mockReq.body = passwordData;
      mockReq.user = mockUser as any;
      mockAuthService.checkUserChangePassword.mockResolvedValue(true);
      mockAuthService.changePassword.mockResolvedValue(mockResult as any);

      await authController.changeUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockAuthService.checkUserChangePassword).toHaveBeenCalledWith(
        mockUser.details.email,
        passwordData.oldPassword
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockResult.data
      );
    });

    it("should return error when user not authenticated", async () => {
      const passwordData = {
        oldPassword: "oldpass123",
        newPassword: "newpass123",
      };

      mockReq.body = passwordData;
      mockReq.user = undefined;

      await authController.changeUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "User not authenticated properly."
      );
    });

    it("should return error when old password is incorrect", async () => {
      const passwordData = {
        oldPassword: "wrongoldpass",
        newPassword: "newpass123",
      };

      const mockUser = {
        id: "test-user-id",
        details: {email: "test@example.com"},
      };

      mockReq.body = passwordData;
      mockReq.user = mockUser as any;
      mockAuthService.checkUserChangePassword.mockResolvedValue(false);

      await authController.changeUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockAuthService.checkUserChangePassword).toHaveBeenCalledWith(
        mockUser.details.email,
        passwordData.oldPassword
      );
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        "Wrong credentials"
      );
    });
  });
});
