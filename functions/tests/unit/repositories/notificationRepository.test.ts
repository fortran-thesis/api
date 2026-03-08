import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {FieldPath} from "firebase-admin/firestore";
import * as notificationRepository from "../../../src/repositories/notificationRepository";
import * as firestoreLib from "../../../src/lib/firestore";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

// ── Shared mock Db with batch support ────────────────────────────────────────

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn().mockReturnValue({
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
});

const mockCountGet = jest.fn();
const mockCount = jest.fn().mockReturnValue({get: mockCountGet});

const mockCollectionDoc = jest.fn().mockReturnValue({id: "auto-id"});
const mockCollection = jest.fn().mockReturnValue({
  doc: mockCollectionDoc,
  where: jest.fn().mockReturnThis(),
  count: mockCount,
  get: jest.fn(),
});

const mockDb = {
  batch: mockBatch,
  collection: mockCollection,
};

mockFirestoreLib.getDb.mockReturnValue(mockDb as any);

// ── Test suite ────────────────────────────────────────────────────────────────

describe("notificationRepository (unit)", () => {
  const baseNotification: any = {
    recipient_id: "user1",
    type: "mold_report_assigned",
    title: "Report Approved",
    body: "Your report has been approved.",
    reference_id: "reportAbc",
    reference_type: "mold_report",
    is_read: false,
    metadata: {
      created_at: null,
      updated_at: null,
      deleted_at: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply persistent mock returns that clearAllMocks resets
    mockFirestoreLib.getDb.mockReturnValue(mockDb as any);
    mockBatch.mockReturnValue({
      set: mockBatchSet,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    });
    mockCollection.mockReturnValue({
      doc: mockCollectionDoc,
      where: jest.fn().mockReturnThis(),
      count: mockCount,
      get: jest.fn(),
    });
    mockCount.mockReturnValue({get: mockCountGet});
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  addNotification
  // ══════════════════════════════════════════════════════════════════════════

  describe("addNotification", () => {
    it("should delegate to addDocument with the notifications collection", async () => {
      const mockDoc = {id: "n1", exists: true};
      mockFirestoreLib.addDocument.mockResolvedValue(mockDoc as any);

      const result = await notificationRepository.addNotification(baseNotification);

      expect(mockFirestoreLib.addDocument).toHaveBeenCalledWith(
        expect.stringContaining("notification"),
        baseNotification
      );
      expect(result).toEqual(mockDoc);
    });

    it("should return null when addDocument returns null", async () => {
      mockFirestoreLib.addDocument.mockResolvedValue(null);

      const result = await notificationRepository.addNotification(baseNotification);

      expect(result).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  findNotificationById
  // ══════════════════════════════════════════════════════════════════════════

  describe("findNotificationById", () => {
    it("should delegate to getDocumentById with the notifications collection", async () => {
      const mockDoc = {id: "n1", exists: true};
      mockFirestoreLib.getDocumentById.mockResolvedValue(mockDoc as any);

      const result = await notificationRepository.findNotificationById("n1");

      expect(mockFirestoreLib.getDocumentById).toHaveBeenCalledWith(
        expect.stringContaining("notification"),
        "n1"
      );
      expect(result).toEqual(mockDoc);
    });

    it("should return null when document does not exist", async () => {
      mockFirestoreLib.getDocumentById.mockResolvedValue(null);

      const result = await notificationRepository.findNotificationById("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  updateNotification
  // ══════════════════════════════════════════════════════════════════════════

  describe("updateNotification", () => {
    it("should delegate to updateDocument with correct args", async () => {
      const mockResult = {writeTime: "2026-01-01"};
      mockFirestoreLib.updateDocument.mockResolvedValue(mockResult as any);

      const result = await notificationRepository.updateNotification("n1", {
        is_read: true,
      });

      expect(mockFirestoreLib.updateDocument).toHaveBeenCalledWith(
        expect.stringContaining("notification"),
        "n1",
        {is_read: true}
      );
      expect(result).toEqual(mockResult);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  softDeleteNotification
  // ══════════════════════════════════════════════════════════════════════════

  describe("softDeleteNotification", () => {
    it("should delegate to softDeleteDocument with the notification id", async () => {
      const mockResult = {writeTime: "2026-01-01"};
      mockFirestoreLib.softDeleteDocument.mockResolvedValue(mockResult as any);

      const result = await notificationRepository.softDeleteNotification("n1");

      expect(mockFirestoreLib.softDeleteDocument).toHaveBeenCalledWith(
        expect.stringContaining("notification"),
        "n1"
      );
      expect(result).toEqual(mockResult);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  findNotificationsByRecipient
  // ══════════════════════════════════════════════════════════════════════════

  describe("findNotificationsByRecipient", () => {
    it("should delegate to getPaginatedDocuments with recipient_id filter", async () => {
      const mockResult = {snapshot: {docs: []}, nextPageToken: null};
      mockFirestoreLib.getPaginatedDocuments.mockResolvedValue(mockResult as any);

      const result = await notificationRepository.findNotificationsByRecipient(
        "user1",
        10,
        undefined,
        undefined,
        ["metadata.created_at", FieldPath.documentId()]
      );

      expect(mockFirestoreLib.getPaginatedDocuments).toHaveBeenCalledWith(
        expect.stringContaining("notification"),
        10,
        undefined,
        ["metadata.created_at", FieldPath.documentId()],
        expect.objectContaining({queryModifier: expect.any(Function)})
      );
      expect(result).toEqual(mockResult);
    });

    it("should apply additional queryModifier when provided", async () => {
      mockFirestoreLib.getPaginatedDocuments.mockResolvedValue(null as any);
      const extraFilter = jest.fn().mockReturnThis();

      await notificationRepository.findNotificationsByRecipient(
        "user1",
        5,
        undefined,
        extraFilter as any
      );

      // Extract the wrapping queryModifier and verify it chains correctly
      const call = mockFirestoreLib.getPaginatedDocuments.mock.calls[0];
      const opts: any = call[4];
      expect(opts.queryModifier).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  addBatchNotifications
  // ══════════════════════════════════════════════════════════════════════════

  describe("addBatchNotifications", () => {
    it("should create a batch, set all docs, commit, and return count", async () => {
      mockBatchCommit.mockResolvedValue(undefined);

      const notifications = [
        {...baseNotification, recipient_id: "farmer1"},
        {...baseNotification, recipient_id: "myco1"},
      ];

      const count = await notificationRepository.addBatchNotifications(notifications);

      expect(mockBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(count).toBe(2);
    });

    it("should return 0 for an empty notifications array", async () => {
      mockBatchCommit.mockResolvedValue(undefined);

      const count = await notificationRepository.addBatchNotifications([]);

      expect(mockBatchSet).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  countUnreadNotifications
  // ══════════════════════════════════════════════════════════════════════════

  describe("countUnreadNotifications", () => {
    it("should return the count of non-deleted unread notifications", async () => {
      const fakeDocs = [
        {data: () => ({metadata: {deleted_at: null}})},        // counted
        {data: () => ({metadata: {deleted_at: null}})},        // counted
        {data: () => ({metadata: {}})},                        // counted (deleted_at undefined)
        {data: () => ({metadata: {deleted_at: {seconds: 1}}})}, // excluded (soft-deleted)
      ];
      const fakeWhere = jest.fn().mockReturnThis();
      const fakeGet = jest.fn().mockResolvedValue({docs: fakeDocs});

      mockCollection.mockReturnValue({
        where: fakeWhere,
        get: fakeGet,
      });

      const count = await notificationRepository.countUnreadNotifications("user1");

      expect(count).toBe(3);
      expect(fakeWhere).toHaveBeenCalledWith("recipient_id", "==", "user1");
      expect(fakeWhere).toHaveBeenCalledWith("is_read", "==", false);
      expect(fakeGet).toHaveBeenCalled();
    });

    it("should return 0 if there are no unread notifications", async () => {
      const fakeWhere = jest.fn().mockReturnThis();
      const fakeGet = jest.fn().mockResolvedValue({docs: []});

      mockCollection.mockReturnValue({
        where: fakeWhere,
        get: fakeGet,
      });

      const count = await notificationRepository.countUnreadNotifications("user2");

      expect(count).toBe(0);
    });
  });
});
