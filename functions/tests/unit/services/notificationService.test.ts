import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as notificationService from "../../../src/services/notificationService";
import {getMessaging} from "firebase-admin/messaging";
import {NotificationType} from "../../../src/types/models/notificationTypes";

// ── Hoisted mock functions ───────────────────────────────────────────────────

const mockAddNotification = jest.fn() as jest.MockedFunction<any>;
const mockFindNotificationById = jest.fn() as jest.MockedFunction<any>;
const mockFindNotificationsByRecipient = jest.fn() as jest.MockedFunction<any>;
const mockUpdateNotification = jest.fn() as jest.MockedFunction<any>;
const mockSoftDeleteNotification = jest.fn() as jest.MockedFunction<any>;
const mockAddBatchNotifications = jest.fn() as jest.MockedFunction<any>;
const mockCountUnreadNotifications = jest.fn() as jest.MockedFunction<any>;
const mockMarkAllAsReadForRecipient = jest.fn() as jest.MockedFunction<any>;

const mockAddDeviceToken = jest.fn() as jest.MockedFunction<any>;
const mockGetDeviceTokens = jest.fn() as jest.MockedFunction<any>;
const mockRemoveDeviceToken = jest.fn() as jest.MockedFunction<any>;
const mockRemoveDeviceTokenByValue = jest.fn() as jest.MockedFunction<any>;

const mockDocumentToJson = jest.fn() as jest.MockedFunction<any>;
const mockQueryToJson = jest.fn() as jest.MockedFunction<any>;

const mockSendEachForMulticast = jest.fn() as jest.MockedFunction<any>;

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("../../../src/utils/dev");

jest.mock("../../../src/configs/firebase", () => ({
  firebase: {},
}));

jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

jest.mock("firebase-admin/messaging", () => ({
  getMessaging: jest.fn(),
}));

jest.mock("../../../src/repositories/notificationRepository", () => ({
  addNotification: (...args: any[]) => mockAddNotification(...args),
  findNotificationById: (...args: any[]) => mockFindNotificationById(...args),
  findNotificationsByRecipient: (...args: any[]) => mockFindNotificationsByRecipient(...args),
  updateNotification: (...args: any[]) => mockUpdateNotification(...args),
  softDeleteNotification: (...args: any[]) => mockSoftDeleteNotification(...args),
  addBatchNotifications: (...args: any[]) => mockAddBatchNotifications(...args),
  countUnreadNotifications: (...args: any[]) => mockCountUnreadNotifications(...args),
  markAllAsReadForRecipient: (...args: any[]) => mockMarkAllAsReadForRecipient(...args),
}));

jest.mock("../../../src/repositories/deviceTokenRepository", () => ({
  addDeviceToken: (...args: any[]) => mockAddDeviceToken(...args),
  getDeviceTokens: (...args: any[]) => mockGetDeviceTokens(...args),
  removeDeviceToken: (...args: any[]) => mockRemoveDeviceToken(...args),
  removeDeviceTokenByValue: (...args: any[]) => mockRemoveDeviceTokenByValue(...args),
}));

jest.mock("../../../src/lib/firestore", () => ({
  documentToJson: (...args: any[]) => mockDocumentToJson(...args),
  queryToJson: (...args: any[]) => mockQueryToJson(...args),
}));

// ── Test suite ────────────────────────────────────────────────────────────────

describe("notificationService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMessaging as jest.Mock).mockReturnValue({
      sendEachForMulticast: mockSendEachForMulticast,
    });
    // Default: no device tokens registered (FCM skipped gracefully)
    mockGetDeviceTokens.mockResolvedValue([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  resolveTemplate
  // ══════════════════════════════════════════════════════════════════════════

  describe("resolveTemplate", () => {
    it("should resolve MOLD_REPORT_ASSIGNED for a farmer", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.MOLD_REPORT_ASSIGNED,
        {case_name: "Kitchen Mold", role: "farmer"}
      );
      expect(result.title).toBe("Report Approved");
      expect(result.body).toContain("Kitchen Mold");
      expect(result.body).toContain("approved");
    });

    it("should resolve MOLD_REPORT_ASSIGNED for a mycologist", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.MOLD_REPORT_ASSIGNED,
        {case_name: "Bathroom Mold", role: "mycologist"}
      );
      expect(result.title).toBe("New Case Assigned");
      expect(result.body).toContain("Bathroom Mold");
    });

    it("should resolve MOLD_REPORT_REJECTED with case name", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.MOLD_REPORT_REJECTED,
        {case_name: "Wall Mold"}
      );
      expect(result.title).toBe("Report Rejected");
      expect(result.body).toContain("Wall Mold");
    });

    it("should resolve MOLD_REPORT_RESOLVED", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.MOLD_REPORT_RESOLVED,
        {case_name: "Ceiling Mold"}
      );
      expect(result.title).toBe("Report Resolved");
      expect(result.body).toContain("resolved");
    });

    it("should resolve FLAG_REPORT_CREATED with content_type", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.FLAG_REPORT_CREATED,
        {content_type: "moldipedia article"}
      );
      expect(result.title).toBe("New Flag Report");
      expect(result.body).toContain("moldipedia article");
    });

    it("should resolve FLAG_REPORT_RESOLVED", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.FLAG_REPORT_RESOLVED,
        {}
      );
      expect(result.title).toBe("Flag Report Resolved");
    });

    it("should resolve CURATOR_APPROVED", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.CURATOR_APPROVED,
        {}
      );
      expect(result.title).toBe("Application Approved");
    });

    it("should resolve CURATOR_REJECTED", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.CURATOR_REJECTED,
        {}
      );
      expect(result.title).toBe("Application Not Approved");
    });

    it("should resolve USER_DISABLED", () => {
      const result = notificationService.resolveTemplate(NotificationType.USER_DISABLED, {});
      expect(result.title).toBe("Account Disabled");
    });

    it("should resolve USER_ENABLED", () => {
      const result = notificationService.resolveTemplate(NotificationType.USER_ENABLED, {});
      expect(result.title).toBe("Account Re-enabled");
    });

    it("should resolve USER_BANNED", () => {
      const result = notificationService.resolveTemplate(NotificationType.USER_BANNED, {});
      expect(result.title).toBe("Account Banned");
    });

    it("should fall back to 'Untitled' when case_name is missing", () => {
      const result = notificationService.resolveTemplate(
        NotificationType.MOLD_REPORT_REJECTED,
        {}
      );
      expect(result.body).toContain("Untitled");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  createNotification
  // ══════════════════════════════════════════════════════════════════════════

  describe("createNotification", () => {
    it("should write notification document and return it", async () => {
      const mockDoc = {id: "notif123", exists: true};
      mockAddNotification.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({
        id: "notif123",
        recipient_id: "user1",
        type: NotificationType.MOLD_REPORT_REJECTED,
        title: "Report Rejected",
        body: "Your report 'Test' was rejected.",
        is_read: false,
      });

      const result = await notificationService.createNotification(
        "user1",
        NotificationType.MOLD_REPORT_REJECTED,
        {case_name: "Test"},
        "report123",
        "mold_report"
      );

      expect(result).not.toBeNull();
      expect(result?.recipient_id).toBe("user1");
      expect(mockAddNotification).toHaveBeenCalledTimes(1);
      // Verify the written payload has the expected shape
      const writtenPayload = mockAddNotification.mock.calls[0][0] as any;
      expect(writtenPayload.recipient_id).toBe("user1");
      expect(writtenPayload.type).toBe(NotificationType.MOLD_REPORT_REJECTED);
      expect(writtenPayload.is_read).toBe(false);
      expect(writtenPayload.reference_id).toBe("report123");
      expect(writtenPayload.reference_type).toBe("mold_report");
    });

    it("should return null when Firestore write fails", async () => {
      mockAddNotification.mockResolvedValue(null);

      const result = await notificationService.createNotification(
        "user1",
        NotificationType.MOLD_REPORT_REJECTED
      );

      expect(result).toBeNull();
    });

    it("should attempt FCM push even when tokens are present", async () => {
      const mockDoc = {id: "notif123", exists: true};
      mockAddNotification.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "notif123"});
      mockGetDeviceTokens.mockResolvedValue([
        {id: "t1", token: "fcm-token-abc", platform: "android"},
      ]);
      mockSendEachForMulticast.mockResolvedValue({successCount: 1, failureCount: 0, responses: []});

      await notificationService.createNotification(
        "user1",
        NotificationType.CURATOR_APPROVED
      );

      // FCM is fire-and-forget — allow the microtask queue to flush
      await new Promise((r) => setImmediate(r));
      expect(mockGetDeviceTokens).toHaveBeenCalledWith("user1");
    });

    it("should not crash when FCM token list is empty", async () => {
      const mockDoc = {id: "notif456"};
      mockAddNotification.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "notif456"});
      mockGetDeviceTokens.mockResolvedValue([]);

      const result = await notificationService.createNotification(
        "user2",
        NotificationType.USER_ENABLED
      );

      expect(result).not.toBeNull();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  createBatchNotifications
  // ══════════════════════════════════════════════════════════════════════════

  describe("createBatchNotifications", () => {
    it("should create notifications for all recipients in a batch", async () => {
      mockAddBatchNotifications.mockResolvedValue(2);

      const count = await notificationService.createBatchNotifications(
        [
          {recipientId: "farmer1", extraContext: {role: "farmer"}},
          {recipientId: "myco1", extraContext: {role: "mycologist"}},
        ],
        NotificationType.MOLD_REPORT_ASSIGNED,
        {case_name: "Storeroom Mold"},
        "report789",
        "mold_report"
      );

      expect(count).toBe(2);
      expect(mockAddBatchNotifications).toHaveBeenCalledTimes(1);
      const payloads = mockAddBatchNotifications.mock.calls[0][0] as any[];
      expect(payloads).toHaveLength(2);
      expect(payloads[0].recipient_id).toBe("farmer1");
      expect(payloads[1].recipient_id).toBe("myco1");
      expect(payloads[0].reference_id).toBe("report789");
    });

    it("should return 0 when batch write fails", async () => {
      mockAddBatchNotifications.mockRejectedValue(new Error("Firestore error"));

      const count = await notificationService.createBatchNotifications(
        [{recipientId: "user1"}],
        NotificationType.MOLD_REPORT_RESOLVED,
        {},
        null,
        null
      );

      expect(count).toBe(0);
    });

    it("should allow per-recipient type override", async () => {
      mockAddBatchNotifications.mockResolvedValue(1);

      await notificationService.createBatchNotifications(
        [{recipientId: "user1", type: NotificationType.MOLD_REPORT_RESOLVED}],
        NotificationType.MOLD_REPORT_ASSIGNED,
        {case_name: "Test"}
      );

      const payloads = mockAddBatchNotifications.mock.calls[0][0] as any[];
      expect(payloads[0].type).toBe(NotificationType.MOLD_REPORT_RESOLVED);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  getNotificationsForUser
  // ══════════════════════════════════════════════════════════════════════════

  describe("getNotificationsForUser", () => {
    it("should return paginated notifications for a user", async () => {
      const mockSnapshot = {size: 1, docs: [{id: "n1", data: () => ({})}]};
      mockFindNotificationsByRecipient.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      });
      mockQueryToJson.mockReturnValue([{id: "n1", recipient_id: "user1"}]);

      const result = await notificationService.getNotificationsForUser("user1", 10);

      expect(result?.snapshot).toHaveLength(1);
      expect(result?.nextPageToken).toBeNull();
    });

    it("should apply is_read filter", async () => {
      const mockSnapshot = {size: 0, docs: []};
      mockFindNotificationsByRecipient.mockResolvedValue({
        snapshot: mockSnapshot,
        nextPageToken: null,
      });
      mockQueryToJson.mockReturnValue([]);

      const result = await notificationService.getNotificationsForUser(
        "user1",
        10,
        undefined,
        {is_read: false}
      );

      expect(result?.snapshot).toHaveLength(0);
    });

    it("should return null when repository returns null", async () => {
      mockFindNotificationsByRecipient.mockResolvedValue(null);

      const result = await notificationService.getNotificationsForUser("user1");

      expect(result).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  getNotificationById
  // ══════════════════════════════════════════════════════════════════════════

  describe("getNotificationById", () => {
    it("should return notification when user is the recipient", async () => {
      const mockDoc = {exists: true, id: "n1"};
      mockFindNotificationById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "user1"});

      const result = await notificationService.getNotificationById("n1", "user1");

      expect(result?.id).toBe("n1");
    });

    it("should return null when notification does not exist", async () => {
      mockFindNotificationById.mockResolvedValue({exists: false});

      const result = await notificationService.getNotificationById("n1", "user1");

      expect(result).toBeNull();
    });

    it("should return null when user is not the recipient (ownership check)", async () => {
      const mockDoc = {exists: true, id: "n1"};
      mockFindNotificationById.mockResolvedValue(mockDoc);
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "user1"});

      const result = await notificationService.getNotificationById("n1", "user2");

      expect(result).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  getUnreadCount
  // ══════════════════════════════════════════════════════════════════════════

  describe("getUnreadCount", () => {
    it("should return the count of unread notifications", async () => {
      mockCountUnreadNotifications.mockResolvedValue(5);

      const count = await notificationService.getUnreadCount("user1");

      expect(count).toBe(5);
    });

    it("should return 0 when repository throws", async () => {
      mockCountUnreadNotifications.mockRejectedValue(new Error("DB error"));

      const count = await notificationService.getUnreadCount("user1");

      expect(count).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  markNotificationRead
  // ══════════════════════════════════════════════════════════════════════════

  describe("markNotificationRead", () => {
    it("should mark notification as read", async () => {
      mockFindNotificationById.mockResolvedValue({exists: true, id: "n1"});
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "user1"});
      mockUpdateNotification.mockResolvedValue({writeTime: "2026-03-01"});

      const result = await notificationService.markNotificationRead("n1", "user1");

      expect(result).toBe(true);
      expect(mockUpdateNotification).toHaveBeenCalledWith("n1", {is_read: true});
    });

    it("should return false when notification not found or wrong owner", async () => {
      mockFindNotificationById.mockResolvedValue({exists: true, id: "n1"});
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "other-user"});

      const result = await notificationService.markNotificationRead("n1", "user1");

      expect(result).toBe(false);
      expect(mockUpdateNotification).not.toHaveBeenCalled();
    });

    it("should return false when update fails", async () => {
      mockFindNotificationById.mockResolvedValue({exists: true, id: "n1"});
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "user1"});
      mockUpdateNotification.mockResolvedValue(null);

      const result = await notificationService.markNotificationRead("n1", "user1");

      expect(result).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  markAllRead
  // ══════════════════════════════════════════════════════════════════════════

  describe("markAllRead", () => {
    it("should return count of updated notifications", async () => {
      mockMarkAllAsReadForRecipient.mockResolvedValue(7);

      const count = await notificationService.markAllRead("user1");

      expect(count).toBe(7);
      expect(mockMarkAllAsReadForRecipient).toHaveBeenCalledWith("user1");
    });

    it("should return 0 when repository throws", async () => {
      mockMarkAllAsReadForRecipient.mockRejectedValue(new Error("DB error"));

      const count = await notificationService.markAllRead("user1");

      expect(count).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  deleteNotificationForUser
  // ══════════════════════════════════════════════════════════════════════════

  describe("deleteNotificationForUser", () => {
    it("should soft-delete notification when user is the owner", async () => {
      mockFindNotificationById.mockResolvedValue({exists: true, id: "n1"});
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "user1"});
      mockSoftDeleteNotification.mockResolvedValue({writeTime: "2026-03-01"});

      const result = await notificationService.deleteNotificationForUser("n1", "user1");

      expect(result).toBe(true);
      expect(mockSoftDeleteNotification).toHaveBeenCalledWith("n1");
    });

    it("should return false when user is not the owner", async () => {
      mockFindNotificationById.mockResolvedValue({exists: true, id: "n1"});
      mockDocumentToJson.mockReturnValue({id: "n1", recipient_id: "other-user"});

      const result = await notificationService.deleteNotificationForUser("n1", "user1");

      expect(result).toBe(false);
      expect(mockSoftDeleteNotification).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  registerToken / unregisterToken
  // ══════════════════════════════════════════════════════════════════════════

  describe("registerToken", () => {
    it("should return the saved token document ID", async () => {
      mockAddDeviceToken.mockResolvedValue("tokenDocId123");

      const id = await notificationService.registerToken("user1", "fcm-abc", "android");

      expect(id).toBe("tokenDocId123");
      expect(mockAddDeviceToken).toHaveBeenCalledWith("user1", {
        token: "fcm-abc",
        platform: "android",
      });
    });

    it("should return null when repository throws", async () => {
      mockAddDeviceToken.mockRejectedValue(new Error("storage error"));

      const id = await notificationService.registerToken("user1", "fcm-abc", "ios");

      expect(id).toBeNull();
    });
  });

  describe("unregisterToken", () => {
    it("should remove a device token by ID", async () => {
      mockRemoveDeviceToken.mockResolvedValue(undefined);

      const result = await notificationService.unregisterToken("user1", "tokenDocId123");

      expect(result).toBe(true);
      expect(mockRemoveDeviceToken).toHaveBeenCalledWith("user1", "tokenDocId123");
    });

    it("should return false when removal throws", async () => {
      mockRemoveDeviceToken.mockRejectedValue(new Error("not found"));

      const result = await notificationService.unregisterToken("user1", "bad-id");

      expect(result).toBe(false);
    });
  });
});
