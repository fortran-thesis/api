/**
 * Integration Tests — Auth Module
 *
 * Tests the full auth flow against Firebase Auth & Firestore emulators:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/logout
 */
import {describe, it, expect, beforeAll, afterAll, beforeEach} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createTestUser,
  TestUser,
} from "./helpers";

describe("Auth Integration Tests", () => {
  beforeAll(async () => {
    await cleanupEmulators();
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/auth/register"))
        .send({
          username: "integrationuser",
          email: "integration@test.com",
          password: "TestPass123!",
          firstName: "Integration",
          lastName: "Test",
          address: "456 Integration Ave",
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject duplicate email registration", async () => {
      const agent = getTestAgent();

      // Register first user
      await agent.post(apiPath("/v1/auth/register")).send({
        username: "duplicate1",
        email: "dup@test.com",
        password: "TestPass123!",
        firstName: "Dup",
        lastName: "User",
        address: "123 Dup St",
      });

      // Try to register with same email
      const res = await agent.post(apiPath("/v1/auth/register")).send({
        username: "duplicate2",
        email: "dup@test.com",
        password: "TestPass123!",
        firstName: "Dup2",
        lastName: "User2",
        address: "456 Dup St",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject invalid email format", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/register")).send({
        username: "baduser",
        email: "not-an-email",
        password: "TestPass123!",
        firstName: "Bad",
        lastName: "Email",
        address: "123 Bad St",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject weak password", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/register")).send({
        username: "weakpass",
        email: "weakpass@test.com",
        password: "weak",
        firstName: "Weak",
        lastName: "Pass",
        address: "123 Weak St",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject missing required fields", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/register")).send({
        email: "noname@test.com",
        password: "TestPass123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    let registeredUser: {username: string; password: string};

    beforeAll(async () => {
      const agent = getTestAgent();
      registeredUser = {
        username: "loginuser",
        password: "LoginPass123!",
      };
      await agent.post(apiPath("/v1/auth/register")).send({
        username: registeredUser.username,
        email: "login@test.com",
        password: registeredUser.password,
        firstName: "Login",
        lastName: "User",
        address: "789 Login Blvd",
      });
    });

    it("should login with valid credentials", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/auth/login"))
        .set("X-Device-Type", "mobile") // farmer role is only allowed on mobile
        .send({
          username: registeredUser.username,
          password: registeredUser.password,
        })
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject invalid credentials", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/login")).send({
        username: registeredUser.username,
        password: "WrongPass123!",
      });

      expect(res.body.success).toBe(false);
    });

    it("should reject missing fields", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/login")).send({
        username: registeredUser.username,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser({
        email: "logouttest@test.com",
        username: "logoutuser",
      });
    });

    it("should logout an authenticated user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/auth/logout"))
        .set("Authorization", `Bearer ${testUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject logout without auth", async () => {
      const agent = getTestAgent();
      const res = await agent.post(apiPath("/v1/auth/logout"));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
