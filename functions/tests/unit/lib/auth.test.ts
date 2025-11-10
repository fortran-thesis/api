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

describe("auth lib (unit)", () => {
  describe("getAuthUserBy (id or email)", () => {
    it("should return WithId<APIUser>", async () => {
      (getAuth().getUser as jest.Mock<any>).mockResolvedValue({
        uid: "mocked",
        email: "mocked@example.com",
        disabled: false,
        displayName: "mocked",
        photoURL: "",
      });
      (findFirestoreUserById as jest.Mock<any>).mockResolvedValue({
        username: "mocked",
        is_banned: false,
        role: Role.USER,
      });

      const resultId = await authLib.getAuthUserById("mocked");
      expect(
        resultId && resultId.id && resultId.user && resultId.details
      ).toBeDefined();

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

      const resultId = await authLib.getAuthUserById("mocked");
      expect(resultId).toBeNull();
      const resultEmail = await authLib.getAuthUserByEmail("mocked");
      expect(resultEmail).toBeNull();
    });

    it("should return null if auth is not found", async () => {
      (findFirestoreUserById as jest.Mock<any>).mockResolvedValue({
        username: "mocked",
        is_banned: false,
        role: Role.USER,
      });

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
