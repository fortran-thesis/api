import { getAuth } from "firebase-admin/auth";
import { retrieveAllUsers } from "../../src/services/userService";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { addUser, deleteFirestoreUser } from "../../src/repositories/userRepository";
import { Role } from "../../src/types/enums";
import { APIUser, PaginatedResult } from "../../src/types/types";

const testUid = "integration_test_uid";
const testUser = { username: "integration_test", role: Role.USER, is_banned: false };

describe("userService (integration)", () => {
  beforeAll(async () => {
    // Add user to Firestore
    await addUser(testUser, testUid);

    // Add user to Firebase Auth
    await getAuth().createUser({
      uid: testUid,
      email: "integration_test@example.com",
      displayName: "Integration Tester"
    });
  });

  afterAll(async () => {
    // Clean up: delete user from Firestore and Auth
    await deleteFirestoreUser(testUid);
    try {
      await getAuth().deleteUser(testUid);
    } catch (_) {}
  });

  it("should retrieve all users and include the test user", async () => {
    const result: PaginatedResult<APIUser[]> | null = await retrieveAllUsers(10);
    expect(result).toBeDefined();
    // Check at least one user matches our test user
    const found = result!.snapshot.find(u => u.user.username === testUser.username);
    expect(found).toBeDefined();
    expect(found &&found.user.username).toBe("integration_test");
  });
});