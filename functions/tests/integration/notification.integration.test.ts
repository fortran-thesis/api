/**
 * Integration Tests — Notification Module
 *
 * Tests all notification REST endpoints against Firebase emulators:
 * - GET    /api/v1/notification                  (Authenticated, list)
 * - GET    /api/v1/notification/unread-count      (Authenticated)
 * - GET    /api/v1/notification/:id               (Authenticated, ownership)
 * - PATCH  /api/v1/notification/:id/read          (Authenticated)
 * - PATCH  /api/v1/notification/read-all          (Authenticated)
 * - DELETE /api/v1/notification/:id               (Authenticated, ownership)
 * - POST   /api/v1/notification/device-token      (Authenticated)
 * - DELETE /api/v1/notification/device-token/:id  (Authenticated)
 */
import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import {
  getTestAgent,
  apiPath,
  cleanupEmulators,
  createAdminUser,
  createTestUser,
  seedDocument,
  getDocument,
  TestUser,
} from "./helpers";

describe("Notification Integration Tests", () => {
  let adminUser: TestUser;
  let farmerUser: TestUser;
  let otherFarmerUser: TestUser;

  let seededNotifId: string;
  let seededUnreadNotifId: string;

  beforeAll(async () => {
    await cleanupEmulators();

    [adminUser, farmerUser, otherFarmerUser] = await Promise.all([
      createAdminUser(),
      createTestUser({
        email: "farmer-notif@test.com",
        username: "farmer_notif",
        role: "farmer",
      }),
      createTestUser({
        email: "other-farmer-notif@test.com",
        username: "other_farmer_notif",
        role: "farmer",
      }),
    ]);

    // Seed a read notification for the farmer
    seededNotifId = await seedDocument("notifications", {
      recipient_id: farmerUser.uid,
      type: "mold_report_assigned",
      title: "Report Approved",
      body: "Your report 'Kitchen Mold' has been approved.",
      reference_id: "reportRef001",
      reference_type: "mold_report",
      is_read: true,
    });

    // Seed an unread notification so unread-count is at least 1
    seededUnreadNotifId = await seedDocument("notifications", {
      recipient_id: farmerUser.uid,
      type: "mold_report_rejected",
      title: "Report Rejected",
      body: "Your report 'Wall Mold' was rejected.",
      reference_id: "reportRef002",
      reference_type: "mold_report",
      is_read: false,
    });
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /api/v1/notification
  // ══════════════════════════════════════════════════════════════════════════

  describe("GET /api/v1/notification", () => {
    it("should return paginated notifications for the authenticated user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Should contain at least the 2 seeded notifications
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by is_read=false", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .query({is_read: "false", limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      // All returned notifications should be unread
      res.body.data.forEach((n: any) => {
        expect(n.is_read).toBe(false);
      });
    });

    it("should filter by type", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .query({type: "mold_report_assigned", limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => {
        expect(n.type).toBe("mold_report_assigned");
      });
    });

    it("should only return the current user's notifications (not other users)", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${otherFarmerUser.token}`)
        .query({limit: "10"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      // otherFarmerUser has no seeded notifications
      res.body.data.forEach((n: any) => {
        expect(n.recipient_id).toBe(otherFarmerUser.uid);
      });
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/notification")).query({limit: "10"});
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /api/v1/notification/unread-count
  // ══════════════════════════════════════════════════════════════════════════

  describe("GET /api/v1/notification/unread-count", () => {
    it("should return the unread notification count", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification/unread-count"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe("number");
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it("should return 0 for a user with no unread notifications", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification/unread-count"))
        .set("Authorization", `Bearer ${otherFarmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(0);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath("/v1/notification/unread-count"));
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /api/v1/notification/:id
  // ══════════════════════════════════════════════════════════════════════════

  describe("GET /api/v1/notification/:id", () => {
    it("should return the notification to the recipient", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/notification/${seededNotifId}`))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(seededNotifId);
      expect(res.body.data.recipient_id).toBe(farmerUser.uid);
    });

    it("should return 404 for a non-existent notification", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification/nonexistentnotifid0000"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(404);
    });

    it("should return 403 or 404 when a different user requests another's notification", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath(`/v1/notification/${seededNotifId}`))
        .set("Authorization", `Bearer ${otherFarmerUser.token}`)
        .expect("Content-Type", /json/);

      // Ownership check returns null → results in 404
      expect([403, 404]).toContain(res.status);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.get(apiPath(`/v1/notification/${seededNotifId}`));
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PATCH /api/v1/notification/:id/read
  // ══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/v1/notification/:id/read", () => {
    it("should mark the notification as read and persist to Firestore", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/notification/${seededUnreadNotifId}/read`))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);

      // Verify the actual Firestore document was updated
      const doc = await getDocument("notifications", seededUnreadNotifId);
      expect(doc.exists).toBe(true);
      expect((doc.data() as any).is_read).toBe(true);
    });

    it("should return 403/404 when another user tries to mark the notification", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath(`/v1/notification/${seededNotifId}/read`))
        .set("Authorization", `Bearer ${otherFarmerUser.token}`)
        .expect("Content-Type", /json/);

      expect([403, 404]).toContain(res.status);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.patch(
        apiPath(`/v1/notification/${seededNotifId}/read`)
      );
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PATCH /api/v1/notification/read-all
  // ══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/v1/notification/read-all", () => {
    it("should mark all notifications as read for the user", async () => {
      const agent = getTestAgent();
      const res = await agent
        .patch(apiPath("/v1/notification/read-all"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.updated).toBe("number");
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.patch(apiPath("/v1/notification/read-all"));
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  DELETE /api/v1/notification/:id
  // ══════════════════════════════════════════════════════════════════════════

  describe("DELETE /api/v1/notification/:id", () => {
    it("should soft-delete a notification owned by the user", async () => {
      // Seed a fresh notification specifically for deletion
      const deleteNotifId = await seedDocument("notifications", {
        recipient_id: farmerUser.uid,
        type: "user_enabled",
        title: "Account Re-enabled",
        body: "Your account has been re-enabled.",
        reference_id: null,
        reference_type: null,
        is_read: false,
      });

      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/notification/${deleteNotifId}`))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);

      // Verify soft delete — deleted_at should be set
      const doc = await getDocument("notifications", deleteNotifId);
      expect(doc.exists).toBe(true);
      expect((doc.data() as any).metadata.deleted_at).not.toBeNull();
    });

    it("should return 403/404 when another user attempts deletion", async () => {
      const agent = getTestAgent();
      const res = await agent
        .delete(apiPath(`/v1/notification/${seededNotifId}`))
        .set("Authorization", `Bearer ${otherFarmerUser.token}`)
        .expect("Content-Type", /json/);

      expect([403, 404]).toContain(res.status);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.delete(apiPath(`/v1/notification/${seededNotifId}`));
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  POST /api/v1/notification/device-token
  // ══════════════════════════════════════════════════════════════════════════

  describe("POST /api/v1/notification/device-token", () => {
    it("should register a device token and return its ID", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/notification/device-token"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .send({token: "fcm-test-token-abc123", platform: "android"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe("string");
    });

    it("should reject invalid platform values", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/notification/device-token"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .send({token: "fcm-test-token", platform: "smartwatch"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(400);
    });

    it("should reject missing token field", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/notification/device-token"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .send({platform: "ios"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(400);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent
        .post(apiPath("/v1/notification/device-token"))
        .send({token: "fcm-test-token", platform: "web"});
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  DELETE /api/v1/notification/device-token/:id
  // ══════════════════════════════════════════════════════════════════════════

  describe("DELETE /api/v1/notification/device-token/:id", () => {
    it("should remove a registered device token", async () => {
      // First register a token to get its ID
      const agent = getTestAgent();
      const registerRes = await agent
        .post(apiPath("/v1/notification/device-token"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .send({token: "fcm-delete-me-token", platform: "ios"});

      expect(registerRes.status).toBe(201);
      const tokenId = registerRes.body.data.id;

      const deleteRes = await agent
        .delete(apiPath(`/v1/notification/device-token/${tokenId}`))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it("should reject unauthenticated requests", async () => {
      const agent = getTestAgent();
      const res = await agent.delete(
        apiPath("/v1/notification/device-token/someTokenId")
      );
      expect(res.status).toBe(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /api/v1/notification — pagination
  // ══════════════════════════════════════════════════════════════════════════

  describe("GET /api/v1/notification — pagination", () => {
    it("should accept a limit query param and return at most that many notifications", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .query({limit: "1"})
        .expect("Content-Type", /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it("should return 400 when limit is missing", async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(apiPath("/v1/notification"))
        .set("Authorization", `Bearer ${farmerUser.token}`)
        .expect("Content-Type", /json/);

      // Zod validates limit as required — missing should be 400
      expect(res.status).toBe(400);
    });
  });
});
