import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { FieldPath } from "firebase-admin/firestore";
import * as userRepository from "../../../src/repositories/userRepository";
import * as authLib from "../../../src/lib/auth";
import * as firestoreLib from "../../../src/lib/firestore";
import { Role } from "../../../src/types/enums";

// Mock all external dependencies
jest.mock("../../../src/lib/auth");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockAuthLib = authLib as jest.Mocked<typeof authLib>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe("userRepository (unit)", () => {
  const mockUser = {
    username: "testuser",
    role: Role.USER,
    is_banned: false,
  };

  const mockUserWithId = {
    id: "test-user-id",
    ...mockUser,
    metadata: {
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addUser", () => {
    it("should successfully add a user", async () => {
      const uid = "test-uid";
      const mockDocSnapshot = {
        id: uid,
        data: jest.fn().mockReturnValue(mockUserWithId),
        exists: true,
      };

      mockFirestoreLib.addDocument.mockResolvedValue(mockDocSnapshot as any);

      const result = await userRepository.addUser(mockUser as any, uid);

      expect(mockFirestoreLib.addDocument).toHaveBeenCalledWith(
        "users",
        mockUser,
        uid
      );
      expect(result).toEqual(mockDocSnapshot);
    });

    it("should return null on failure", async () => {
      const uid = "test-uid";
      mockFirestoreLib.addDocument.mockResolvedValue(null);

      const result = await userRepository.addUser(mockUser as any, uid);

      expect(result).toBeNull();
    });
  });

  describe("findFirestoreUserById", () => {
    it("should find user by ID", async () => {
      const userId = "test-user-id";
      const mockDocSnapshot = {
        id: userId,
        data: jest.fn().mockReturnValue(mockUserWithId),
        exists: true,
      };

      mockFirestoreLib.getDocumentById.mockResolvedValue(
        mockDocSnapshot as any
      );

      const result = await userRepository.findFirestoreUserById(userId);

      expect(mockFirestoreLib.getDocumentById).toHaveBeenCalledWith(
        "users",
        userId
      );
      expect(result).toEqual(mockDocSnapshot);
    });

    it("should return null when user not found", async () => {
      const userId = "nonexistent-user";
      mockFirestoreLib.getDocumentById.mockResolvedValue(null);

      const result = await userRepository.findFirestoreUserById(userId);

      expect(result).toBeNull();
    });
  });

  describe("findAuthUserById", () => {
    it("should find auth user by ID", async () => {
      const userId = "test-user-id";
      const mockAuthUser = {
        uid: userId,
        user: mockUser,
        details: {
          email: "test@example.com",
          emailVerified: true,
        },
      };

      mockAuthLib.getAuthUserById.mockResolvedValue(mockAuthUser as any);

      const result = await userRepository.findAuthUserById(userId);

      expect(mockAuthLib.getAuthUserById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockAuthUser);
    });

    it("should return null when auth user not found", async () => {
      const userId = "nonexistent-user";
      mockAuthLib.getAuthUserById.mockResolvedValue(null);

      const result = await userRepository.findAuthUserById(userId);

      expect(result).toBeNull();
    });
  });

  describe("findAuthUserByEmail", () => {
    it("should find auth user by email", async () => {
      const email = "test@example.com";
      const mockAuthUser = {
        uid: "test-user-id",
        user: mockUser,
        details: {
          email,
          emailVerified: true,
        },
      };

      mockAuthLib.getAuthUserByEmail.mockResolvedValue(mockAuthUser as any);

      const result = await userRepository.findAuthUserByEmail(email);

      expect(mockAuthLib.getAuthUserByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockAuthUser);
    });

    it("should return null when auth user not found by email", async () => {
      const email = "nonexistent@example.com";
      mockAuthLib.getAuthUserByEmail.mockResolvedValue(null);

      const result = await userRepository.findAuthUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe("findAllUsers", () => {
    it("should retrieve paginated users with default order fields", async () => {
      const limit = 10;
      const mockPaginatedResult = {
        snapshot: [mockUserWithId],
        nextPageToken: null,
      };

      mockFirestoreLib.getPaginatedDocuments.mockResolvedValue(
        mockPaginatedResult as any
      );

      const result = await userRepository.findAllUsers(limit);

      expect(mockFirestoreLib.getPaginatedDocuments).toHaveBeenCalledWith(
        "users",
        limit,
        undefined,
        ["metadata.created_at", "username", FieldPath.documentId()],
        {}
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it("should use custom pagination token", async () => {
      const limit = 5;
      const token = "pagination-token-123";
      const mockPaginatedResult = {
        snapshot: [],
        nextPageToken: null,
      };

      mockFirestoreLib.getPaginatedDocuments.mockResolvedValue(
        mockPaginatedResult as any
      );

      const result = await userRepository.findAllUsers(limit, token);

      expect(mockFirestoreLib.getPaginatedDocuments).toHaveBeenCalledWith(
        "users",
        limit,
        token,
        ["metadata.created_at", "username", FieldPath.documentId()],
        {}
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it("should use custom order fields", async () => {
      const limit = 10;
      const customOrderFields = ["username", FieldPath.documentId()];
      const mockPaginatedResult = {
        snapshot: [mockUserWithId],
        nextPageToken: null,
      };

      mockFirestoreLib.getPaginatedDocuments.mockResolvedValue(
        mockPaginatedResult as any
      );

      const result = await userRepository.findAllUsers(
        limit,
        undefined,
        customOrderFields
      );

      expect(mockFirestoreLib.getPaginatedDocuments).toHaveBeenCalledWith(
        "users",
        limit,
        undefined,
        customOrderFields,
        {}
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe("updateFirestoreUser", () => {
    it("should successfully update user", async () => {
      const uid = "test-user-id";
      const updateData = { username: "newusername" };
      const mockWriteResult = { writeTime: new Date() };

      mockFirestoreLib.updateDocument.mockResolvedValue(mockWriteResult as any);

      const result = await userRepository.updateFirestoreUser(uid, updateData);

      expect(mockFirestoreLib.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        updateData
      );
      expect(result).toEqual(mockWriteResult);
    });

    it("should return null on update failure", async () => {
      const uid = "test-user-id";
      const updateData = { username: "newusername" };

      mockFirestoreLib.updateDocument.mockResolvedValue(null);

      const result = await userRepository.updateFirestoreUser(uid, updateData);

      expect(result).toBeNull();
    });
  });

  describe("deleteFirestoreUser", () => {
    it("should successfully delete user", async () => {
      const uid = "test-user-id";
      const mockWriteResult = { writeTime: new Date() };

      mockFirestoreLib.deleteDocument.mockResolvedValue(mockWriteResult as any);

      const result = await userRepository.deleteFirestoreUser(uid);

      expect(mockFirestoreLib.deleteDocument).toHaveBeenCalledWith(
        "users",
        uid
      );
      expect(result).toEqual(mockWriteResult);
    });

    it("should return null on delete failure", async () => {
      const uid = "test-user-id";

      mockFirestoreLib.deleteDocument.mockResolvedValue(null);

      const result = await userRepository.deleteFirestoreUser(uid);

      expect(result).toBeNull();
    });
  });

  describe("softDeleteFirestoreUser", () => {
    it("should successfully soft delete user", async () => {
      const uid = "test-user-id";
      const mockWriteResult = { writeTime: new Date() };

      mockFirestoreLib.softDeleteDocument.mockResolvedValue(
        mockWriteResult as any
      );

      const result = await userRepository.softDeleteFirestoreUser(uid);

      expect(mockFirestoreLib.softDeleteDocument).toHaveBeenCalledWith(
        "users",
        uid
      );
      expect(result).toEqual(mockWriteResult);
    });

    it("should return null on soft delete failure", async () => {
      const uid = "test-user-id";

      mockFirestoreLib.softDeleteDocument.mockResolvedValue(null);

      const result = await userRepository.softDeleteFirestoreUser(uid);

      expect(result).toBeNull();
    });
  });
});
