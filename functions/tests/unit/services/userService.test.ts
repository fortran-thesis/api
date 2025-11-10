import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as userService from "../../../src/services/userService";
import {getAuth} from "firebase-admin/auth";

const mockFindAllUsers = jest.fn() as jest.MockedFunction<any>;
const mockFindUsersByRole = jest.fn() as jest.MockedFunction<any>;
const mockFindAuthUserById = jest.fn() as jest.MockedFunction<any>;
const mockFindAuthUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockCountUsersByRoles = jest.fn() as jest.MockedFunction<any>;
const mockCountUsersByDisabled = jest.fn() as jest.MockedFunction<any>;
const mockGetUsers = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;
const mockGetCachedList = jest.fn() as jest.MockedFunction<any>;
const mockCacheList = jest.fn() as jest.MockedFunction<any>;
const mockGetCachedItem = jest.fn() as jest.MockedFunction<any>;
const mockCacheItem = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/userRepository", () => ({
  findAllUsers: (...args: any[]) => mockFindAllUsers(...args),
  findUsersByRole: (...args: any[]) => mockFindUsersByRole(...args),
  findAuthUserById: (...args: any[]) => mockFindAuthUserById(...args),
  findAuthUserByEmail: (...args: any[]) => mockFindAuthUserByEmail(...args),
  countUsersByRoles: (...args: any[]) => mockCountUsersByRoles(...args),
  countUsersByDisabled: () => mockCountUsersByDisabled(),
}));
jest.mock("../../../src/lib/firestore", () => ({
  queryToJson: (...args: any[]) => mockQueryToJson(...args),
}));
jest.mock("../../../src/lib/auth");
jest.mock("../../../src/utils/dev");
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));
jest.mock("../../../src/utils/cacheManager", () => ({
  getCachedList: (...args: any[]) => mockGetCachedList(...args),
  cacheList: (...args: any[]) => mockCacheList(...args),
  getCachedItem: (...args: any[]) => mockGetCachedItem(...args),
  cacheItem: (...args: any[]) => mockCacheItem(...args),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

describe("userService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({
      getUsers: mockGetUsers,
    });
    mockGetCachedList.mockResolvedValue(null);
    mockGetCachedItem.mockResolvedValue(null);
    mockCacheList.mockResolvedValue(undefined);
    mockCacheItem.mockResolvedValue(undefined);
  });

  describe("retrieveAllUsers", () => {
    it("should retrieve all users with pagination", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllUsers.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: "token123",
      });
      mockQueryToJson.mockReturnValue([
        {id: "user1", username: "john"},
        {id: "user2", username: "jane"},
      ]);
      mockGetUsers.mockResolvedValue({
        users: [
          {uid: "user1", email: "john@example.com", displayName: "John Doe"},
          {uid: "user2", email: "jane@example.com", displayName: "Jane Doe"},
        ],
      });

      const result = await userService.retrieveAllUsers(10, "token");

      expect(result?.snapshot).toHaveLength(2);
      expect(result?.nextPageToken).toBe("token123");
      expect(result?.snapshot[0].details.email).toBe("john@example.com");
    });

    it("should return null when no users found", async () => {
      mockFindAllUsers.mockResolvedValue(null);

      const result = await userService.retrieveAllUsers(10);

      expect(result).toBeNull();
    });
  });

  describe("retrieveUsersByRole", () => {
    it("should retrieve users by role", async () => {
      const mockSnapshot = {size: 1, docs: []};
      mockFindUsersByRole.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      });
      mockQueryToJson.mockReturnValue([{id: "user1", role: "admin"}]);
      mockGetUsers.mockResolvedValue({
        users: [{uid: "user1", email: "admin@example.com"}],
      });

      const result = await userService.retrieveUsersByRole("admin", 10);

      expect(result?.snapshot).toHaveLength(1);
      expect(result?.snapshot[0].user.role).toBe("admin");
    });
  });

  describe("retrieveUserById", () => {
    it("should retrieve user by id", async () => {
      mockFindAuthUserById.mockResolvedValue({
        id: "user1",
        user: {username: "john"},
        details: {email: "john@example.com"},
      });

      const result = await userService.retrieveUserById("user1");

      expect(result).toBeTruthy();
      expect(result?.user.username).toBe("john");
    });

    it("should return null when user not found", async () => {
      mockFindAuthUserById.mockResolvedValue(null);

      const result = await userService.retrieveUserById("invalid");

      expect(result).toBeNull();
    });
  });

  describe("retrieveUserByEmail", () => {
    it("should retrieve user by email", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user1",
        user: {username: "john"},
        details: {email: "john@example.com"},
      });

      const result = await userService.retrieveUserByEmail("john@example.com");

      expect(result).toBeTruthy();
      expect(result?.details.email).toBe("john@example.com");
    });

    it("should return null when user not found", async () => {
      mockFindAuthUserByEmail.mockResolvedValue(null);

      const result = await userService.retrieveUserByEmail("invalid@example.com");

      expect(result).toBeNull();
    });
  });

  describe("getRoleCounts", () => {
    it("should return role counts", async () => {
      mockCountUsersByRoles.mockResolvedValue(10);

      const result = await userService.getRoleCounts();

      expect(result).toBeTruthy();
      // Role enum values are the actual keys returned
      expect(Object.keys(result || {}).length).toBeGreaterThan(0);
      // At least one count should be returned
      expect(Object.values(result || {}).some((v) => typeof v === "number")).toBe(true);
    });

    it("should return null on error", async () => {
      mockCountUsersByRoles.mockRejectedValue(new Error("DB error"));

      const result = await userService.getRoleCounts();

      expect(result).toBeNull();
    });
  });

  describe("getDisabledCounts", () => {
    it("should return active/inactive counts", async () => {
      mockCountUsersByDisabled.mockResolvedValue({active: 50, inactive: 10});

      const result = await userService.getDisabledCounts();

      expect(result).toEqual({active: 50, inactive: 10});
    });

    it("should return null on error", async () => {
      mockCountUsersByDisabled.mockRejectedValue(new Error("DB error"));

      const result = await userService.getDisabledCounts();

      expect(result).toBeNull();
    });
  });

  describe("getUsersByActiveStatus", () => {
    it("should filter users by active status", async () => {
      const mockSnapshot = {size: 2, docs: []};
      mockFindAllUsers.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      });
      mockQueryToJson.mockReturnValue([
        {id: "user1", username: "active"},
        {id: "user2", username: "inactive"},
      ]);
      mockGetUsers.mockResolvedValue({
        users: [
          {uid: "user1", email: "active@example.com", disabled: false},
          {uid: "user2", email: "inactive@example.com", disabled: true},
        ],
      });

      const result = await userService.getUsersByActiveStatus(10, undefined, true);

      expect(result?.snapshot).toHaveLength(1);
      expect(result?.snapshot[0].details.disabled).toBe(false);
    });
  });
});
