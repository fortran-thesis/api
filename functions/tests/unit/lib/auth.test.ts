import { describe, it, expect, jest } from "@jest/globals";
import { getAuth } from "firebase-admin/auth";
import { findFirestoreUserById } from "../../../src/repositories/userRepository";
import { Role } from "../../../src/types/enums";
import * as authLib from "../../../src/lib/auth";
import { APIUser, WithId } from "../../../src/types/types";

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn().mockReturnValue({
    getUser: jest.fn(),
    createSessionCookie: jest.fn(),
    verifyIdToken: jest.fn(),
    verifySessionCookie: jest.fn(),
  }),
}));
jest.mock("../../../src/repositories/userRepository", () => ({
  findFirestoreUserById: jest.fn(),
}));
jest.mock("../../../src/utils/storageTransform", () => ({
  transformToSignedUrl: (jest.fn().mockResolvedValue("https://signed.url") as any),
}));

describe("auth lib (unit)", () => {
  beforeEach(() => {
    // Clear cached auth users between tests to prevent LRU cache bleed
    authLib.invalidateAuthUserCache("mocked");
  });

  describe("getAuthUserBy (id or email)", () => {
    it("should return WithId<APIUser>", async () => {
      (getAuth().getUser as jest.Mock<any>).mockResolvedValue({
        uid: "mocked",
        email: "mocked@example.com",
        disabled: false,
        displayName: "mocked",
        photoURL: "users/123_pic.jpg",
      });
      (findFirestoreUserById as jest.Mock<any>).mockResolvedValue({
        data: () => ({
          username: "mocked",
          is_banned: false,
          role: Role.USER,
          first_name: "Mock",
          last_name: "User",
          address: "123 Main St",
        }),
      });

      const resultId = await authLib.getAuthUserById("mocked");
      expect(
        resultId && resultId.id && resultId.user && resultId.details
      ).toBeDefined();
      expect((resultId as any).details.photo_url).toBe("https://signed.url");

      const resultEmail = await authLib.getAuthUserByEmail("mocked");
      expect(
        resultEmail && resultEmail.id && resultEmail.user && resultEmail.details
      ).toBeDefined();
    });

    it("should return null if firestore is not found", async () => {
      (getAuth().getUser as jest.Mock<any>).mockResolvedValue({
        uid: "mocked",
        email: "mocked@example.com",
        disabled: false,
        displayName: "mocked",
        photoURL: "",
      });
      // Return null to simulate missing Firestore user document
      (findFirestoreUserById as jest.Mock<any>).mockResolvedValue(null);

      const resultId = await authLib.getAuthUserById("mocked");
      expect(resultId).toBeNull();
      const resultEmail = await authLib.getAuthUserByEmail("mocked");
      expect(resultEmail).toBeNull();
    });

    it("should return null if auth is not found", async () => {
      (findFirestoreUserById as jest.Mock<any>).mockResolvedValue({
        data: () => ({
          username: "mocked",
          is_banned: false,
          role: Role.USER,
        }),
      });
      // Simulate no auth record
      (getAuth().getUser as jest.Mock<any>).mockResolvedValue(null);

      const resultId = await authLib.getAuthUserById("mocked");
      expect(resultId).toBeNull();
      const resultEmail = await authLib.getAuthUserByEmail("mocked");
      expect(resultEmail).toBeNull();
    });
  });

  describe("verify (token or token)", () => {
    const resultUser: WithId<APIUser> = {
      id: "test",
      user: {
        username: "mocked",
        is_banned: false,
        role: Role.USER,
        first_name: "Mock",
        last_name: "User",
        address: "123 Main St",
      },
      details: {
        email: "mocked@example.com",
        disabled: false,
        displayName: "mocked",
        photo_url: "",
      },
    };
    it("should return WithId<APIUser> if valid token", async () => {
      (getAuth().verifyIdToken as jest.Mock<any>).mockResolvedValue({
        uid: "test",
      });
      (getAuth().verifySessionCookie as jest.Mock<any>).mockResolvedValue({
        uid: "test",
      });
      jest.spyOn(authLib, "getAuthUserById").mockResolvedValue(resultUser);

      const resultToken = await authLib.verifyToken("mocked");
      expect(resultToken).toStrictEqual(resultUser);
      const resultCookie = await authLib.verifyCookie("mocked");
      expect(resultToken).toStrictEqual(resultUser);
    });

    it("should return null if invalid token", async () => {
      (getAuth().verifyIdToken as jest.Mock<any>).mockResolvedValue({});
      (getAuth().verifySessionCookie as jest.Mock<any>).mockResolvedValue({});
      const resultToken = await authLib.verifyToken("mocked");
      expect(resultToken).toBeNull();
      const resultCookie = await authLib.verifyCookie("mocked");
      expect(resultToken).toBeNull();
    });

    it("should return null if UID mismatch", async () => {
      (getAuth().verifyIdToken as jest.Mock<any>).mockResolvedValue({
        uid: "fake",
      });
      (getAuth().verifySessionCookie as jest.Mock<any>).mockResolvedValue({
        uid: "fake",
      });
      jest.spyOn(authLib, "getAuthUserById").mockResolvedValue(resultUser);
      const resultToken = await authLib.verifyToken("mocked");
      expect(resultToken).toBeNull();
      const resultCookie = await authLib.verifyCookie("mocked");
      expect(resultToken).toBeNull();
    });
  });

  it("should generate token", async () => {
    (getAuth().createSessionCookie as jest.Mock<any>).mockResolvedValue(
      "cookie"
    );
    const cookie = await authLib.generateCookie("mocked");
    expect(cookie).toBe("cookie");
  });
});
