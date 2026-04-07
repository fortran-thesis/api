import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as cultureSessionService from "../../../src/services/cultureSessionService";
import * as cultureSessionRepository from "../../../src/repositories/cultureSessionRepository";
import * as firestoreLib from "../../../src/lib/firestore";

jest.mock("../../../src/repositories/cultureSessionRepository");
jest.mock("../../../src/lib/firestore");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/utils/normalizeResponse", () => ({
  normalizeResponseTimestamps: jest.fn((v: unknown) => v),
}));
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockRepo = cultureSessionRepository as jest.Mocked<typeof cultureSessionRepository>;
const mockFirestore = firestoreLib as jest.Mocked<typeof firestoreLib>;

// ── helpers ──────────────────────────────────────────────────────────────────

const pastTimestamp = Timestamp.fromDate(new Date(Date.now() - 60_000));
const futureTimestamp = Timestamp.fromDate(new Date(Date.now() + 3_600_000));

function makeDocSnapshot(id: string, data: Record<string, unknown>) {
  return {
    id,
    exists: true,
    data: jest.fn().mockReturnValue(data),
  };
}

function makeSessionData(overrides: Record<string, unknown> = {}) {
  return {
    case_id: "case-1",
    name: "Batch A",
    target_at: futureTimestamp,
    ended_at: null,
    deleted_at: null,
    metadata: {
      created_at: Timestamp.now(),
      updated_at: null,
      deleted_at: null,
    },
    ...overrides,
  };
}

// ── listCultureSessionsByCase ─────────────────────────────────────────────────

describe("listCultureSessionsByCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated session items with computed status", async () => {
    const data = makeSessionData();
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue({
      docs: [makeDocSnapshot("sess-1", data)],
      nextPageToken: null,
    } as any);

    const result = await cultureSessionService.listCultureSessionsByCase("case-1");

    expect(result).not.toBeNull();
    expect(result!.snapshot).toHaveLength(1);
    expect(result!.snapshot[0].id).toBe("sess-1");
    expect(result!.snapshot[0].status).toBe("incubating");
    expect(result!.snapshot[0].is_available_for_logs).toBe(false);
  });

  it("marks session as available when target_at is in the past", async () => {
    const data = makeSessionData({target_at: pastTimestamp});
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue({
      docs: [makeDocSnapshot("sess-2", data)],
      nextPageToken: null,
    } as any);

    const result = await cultureSessionService.listCultureSessionsByCase("case-1");

    expect(result!.snapshot[0].status).toBe("available");
    expect(result!.snapshot[0].is_available_for_logs).toBe(true);
  });

  it("marks session as ended_early when ended_at is set", async () => {
    const data = makeSessionData({ended_at: Timestamp.now()});
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue({
      docs: [makeDocSnapshot("sess-3", data)],
      nextPageToken: null,
    } as any);

    const result = await cultureSessionService.listCultureSessionsByCase("case-1");

    expect(result!.snapshot[0].status).toBe("ended_early");
    expect(result!.snapshot[0].is_available_for_logs).toBe(true);
  });

  it("returns null when repository returns null", async () => {
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue(null as any);

    const result = await cultureSessionService.listCultureSessionsByCase("case-1");

    expect(result).toBeNull();
  });

  it("returns null on repository error", async () => {
    mockRepo.findCultureSessionsByCaseId.mockRejectedValue(new Error("db error"));

    const result = await cultureSessionService.listCultureSessionsByCase("case-1");

    expect(result).toBeNull();
  });
});

// ── listAvailableCultureSessionsByCase ───────────────────────────────────────

describe("listAvailableCultureSessionsByCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns sessions available by timer or end-early status", async () => {
    const available = makeSessionData({target_at: pastTimestamp});
    const incubating = makeSessionData();
    const endedEarly = makeSessionData({ended_at: Timestamp.now()});
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue({
      docs: [
        makeDocSnapshot("sess-a", available),
        makeDocSnapshot("sess-b", incubating),
        makeDocSnapshot("sess-c", endedEarly),
      ],
      nextPageToken: null,
    } as any);

    const result = await cultureSessionService.listAvailableCultureSessionsByCase("case-1");

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result!.map((item) => item.id)).toEqual(expect.arrayContaining(["sess-a", "sess-c"]));
  });

  it("returns null when listCultureSessionsByCase returns null", async () => {
    mockRepo.findCultureSessionsByCaseId.mockResolvedValue(null as any);

    const result = await cultureSessionService.listAvailableCultureSessionsByCase("case-1");

    expect(result).toBeNull();
  });
});

// ── createCultureSessionForCase ──────────────────────────────────────────────

describe("createCultureSessionForCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates and returns a session item with incubating status", async () => {
    const data = makeSessionData();
    const snapshot = makeDocSnapshot("sess-new", data);
    mockRepo.addCultureSession.mockResolvedValue(snapshot as any);
    mockFirestore.documentToJson.mockReturnValue({id: "sess-new", ...data} as any);

    const result = await cultureSessionService.createCultureSessionForCase("case-1", {
      name: "Batch A",
      target_at: futureTimestamp,
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("sess-new");
    expect(result!.status).toBe("incubating");
  });

  it("returns null when addCultureSession returns null", async () => {
    mockRepo.addCultureSession.mockResolvedValue(null as any);

    const result = await cultureSessionService.createCultureSessionForCase("case-1", {
      name: "Batch A",
      target_at: futureTimestamp,
    });

    expect(result).toBeNull();
  });

  it("returns null on repository error", async () => {
    mockRepo.addCultureSession.mockRejectedValue(new Error("write failed"));

    const result = await cultureSessionService.createCultureSessionForCase("case-1", {
      name: "Batch A",
      target_at: futureTimestamp,
    });

    expect(result).toBeNull();
  });
});

// ── endCultureSessionEarlyForCase ────────────────────────────────────────────

describe("endCultureSessionEarlyForCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates ended_at and returns session with ended_early status", async () => {
    const original = makeSessionData();
    const updated = makeSessionData({ended_at: Timestamp.now()});
    mockRepo.findCultureSessionById
      .mockResolvedValueOnce(makeDocSnapshot("sess-1", original) as any)
      .mockResolvedValueOnce(makeDocSnapshot("sess-1", updated) as any);
    mockRepo.updateCultureSession.mockResolvedValue({} as any);

    const result = await cultureSessionService.endCultureSessionEarlyForCase("case-1", "sess-1");

    expect(result).not.toBeNull();
    expect(result!.status).toBe("ended_early");
    expect(result!.is_available_for_logs).toBe(true);
    expect(mockRepo.updateCultureSession).toHaveBeenCalledWith(
      "case-1",
      "sess-1",
      expect.objectContaining({ended_at: expect.anything()})
    );
  });

  it("returns existing item immediately when already ended_early", async () => {
    const alreadyEnded = makeSessionData({ended_at: Timestamp.now()});
    mockRepo.findCultureSessionById.mockResolvedValue(
      makeDocSnapshot("sess-1", alreadyEnded) as any
    );

    const result = await cultureSessionService.endCultureSessionEarlyForCase("case-1", "sess-1");

    expect(result).not.toBeNull();
    expect(result!.status).toBe("ended_early");
    expect(mockRepo.updateCultureSession).not.toHaveBeenCalled();
  });

  it("returns null when session is not found", async () => {
    mockRepo.findCultureSessionById.mockResolvedValue(null as any);

    const result = await cultureSessionService.endCultureSessionEarlyForCase("case-1", "sess-x");

    expect(result).toBeNull();
  });

  it("returns null when session is soft-deleted", async () => {
    const deleted = makeSessionData();
    (deleted.metadata as any).deleted_at = Timestamp.now();
    mockRepo.findCultureSessionById.mockResolvedValue(
      makeDocSnapshot("sess-1", deleted) as any
    );

    const result = await cultureSessionService.endCultureSessionEarlyForCase("case-1", "sess-1");

    expect(result).toBeNull();
  });
});

// ── reassignCultureSessionForCase ────────────────────────────────────────────

describe("reassignCultureSessionForCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("clears ended_at, updates target_at, returns session with recomputed status", async () => {
    const original = makeSessionData({ended_at: Timestamp.now()});
    const newTarget = futureTimestamp;
    const refreshed = makeSessionData({target_at: newTarget, ended_at: null});
    mockRepo.findCultureSessionById
      .mockResolvedValueOnce(makeDocSnapshot("sess-1", original) as any)
      .mockResolvedValueOnce(makeDocSnapshot("sess-1", refreshed) as any);
    mockRepo.updateCultureSession.mockResolvedValue({} as any);

    const result = await cultureSessionService.reassignCultureSessionForCase("case-1", "sess-1", {
      target_at: newTarget,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("incubating");
    expect(mockRepo.updateCultureSession).toHaveBeenCalledWith(
      "case-1",
      "sess-1",
      expect.objectContaining({target_at: newTarget, ended_at: null})
    );
  });

  it("returns null when session is not found", async () => {
    mockRepo.findCultureSessionById.mockResolvedValue(null as any);

    const result = await cultureSessionService.reassignCultureSessionForCase(
      "case-1",
      "sess-x",
      {target_at: futureTimestamp}
    );

    expect(result).toBeNull();
  });

  it("returns null when session is soft-deleted", async () => {
    const deleted = makeSessionData();
    (deleted.metadata as any).deleted_at = Timestamp.now();
    mockRepo.findCultureSessionById.mockResolvedValue(
      makeDocSnapshot("sess-1", deleted) as any
    );

    const result = await cultureSessionService.reassignCultureSessionForCase(
      "case-1",
      "sess-1",
      {target_at: futureTimestamp}
    );

    expect(result).toBeNull();
  });
});

// ── deleteCultureSessionForCase ──────────────────────────────────────────────

describe("deleteCultureSessionForCase", () => {
  beforeEach(() => jest.clearAllMocks());

  it("soft-deletes the session and returns true", async () => {
    mockRepo.softDeleteCultureSession.mockResolvedValue({} as any);

    const result = await cultureSessionService.deleteCultureSessionForCase("case-1", "sess-1");

    expect(result).toBe(true);
    expect(mockRepo.softDeleteCultureSession).toHaveBeenCalledWith("case-1", "sess-1");
  });

  it("returns false when softDeleteCultureSession returns falsy", async () => {
    mockRepo.softDeleteCultureSession.mockResolvedValue(null as any);

    const result = await cultureSessionService.deleteCultureSessionForCase("case-1", "sess-1");

    expect(result).toBe(false);
  });

  it("returns false on repository error", async () => {
    mockRepo.softDeleteCultureSession.mockRejectedValue(new Error("delete failed"));

    const result = await cultureSessionService.deleteCultureSessionForCase("case-1", "sess-1");

    expect(result).toBe(false);
  });
});
