import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Request, Response} from "express";
import {NotificationType} from "../../../src/types/models/notificationTypes";
import {notify} from "../../../src/middlewares/notificationMiddleware";

// ── Hoisted mock functions ────────────────────────────────────────────────────

const mockCreateBatchNotifications = jest.fn() as jest.MockedFunction<any>;

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("../../../src/utils/dev");

jest.mock("../../../src/services/notificationService", () => ({
  createBatchNotifications: (...args: any[]) => mockCreateBatchNotifications(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal fake Express Request. Extra props (uid, body, params)
 * can be passed in via `overrides`.
 */
function buildRequest(overrides?: Partial<Request> & Record<string, any>): Request {
  return {
    uid: "user1",
    body: {},
    params: {},
    query: {},
    headers: {},
    _notificationResBody: undefined,
    ...overrides,
  } as unknown as Request;
}

/**
 * Build a fake Express Response that stores listeners and lets us
 * trigger `finish` synchronously.
 */
function buildResponse(overrides?: Partial<Response>): Response {
  const listeners: Record<string, Function[]> = {};

  const res: Partial<Response> & {_body: any; statusCode: number} = {
    statusCode: 200,
    _body: undefined,

    on(event: string, listener: Function) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(listener);
      return this as any;
    },

    json(body: any) {
      (this as any)._body = body;
      return this as any;
    },

    emit(event: string) {
      (listeners[event] ?? []).forEach((fn) => fn());
      return true;
    },

    ...overrides,
  };

  return res as unknown as Response;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("notificationMiddleware — notify()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should call next() immediately without waiting for a response", () => {
    const req = buildRequest();
    const res = buildResponse();
    const next = jest.fn();

    notify({
      type: NotificationType.MOLD_REPORT_ASSIGNED,
      recipientsFn: () => [{recipientId: "user2"}],
    })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call createBatchNotifications on 2xx response", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);
    const req = buildRequest();
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify({
      type: NotificationType.MOLD_REPORT_ASSIGNED,
      recipientsFn: () => [{recipientId: "farmerUser"}],
    })(req, res, next);

    // Simulate the response finishing
    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(mockCreateBatchNotifications).toHaveBeenCalledTimes(1);
    const [recipients, type] = mockCreateBatchNotifications.mock.calls[0];
    expect(recipients).toEqual([{recipientId: "farmerUser"}]);
    expect(type).toBe(NotificationType.MOLD_REPORT_ASSIGNED);
  });

  it("should NOT call createBatchNotifications on 4xx response", async () => {
    const req = buildRequest();
    const res = buildResponse({statusCode: 400});
    const next = jest.fn();

    notify({
      type: NotificationType.FLAG_REPORT_CREATED,
      recipientsFn: () => [{recipientId: "admin1"}],
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(mockCreateBatchNotifications).not.toHaveBeenCalled();
  });

  it("should NOT call createBatchNotifications on 5xx response", async () => {
    const req = buildRequest();
    const res = buildResponse({statusCode: 500});
    const next = jest.fn();

    notify({
      type: NotificationType.USER_DISABLED,
      recipientsFn: () => [{recipientId: "user1"}],
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(mockCreateBatchNotifications).not.toHaveBeenCalled();
  });

  it("should skip when recipientsFn returns an empty array", async () => {
    const req = buildRequest();
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify({
      type: NotificationType.FLAG_REPORT_RESOLVED,
      recipientsFn: () => [],
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(mockCreateBatchNotifications).not.toHaveBeenCalled();
  });

  it("should filter out recipients with falsy recipientId", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);
    const req = buildRequest();
    const res = buildResponse({statusCode: 201});
    const next = jest.fn();

    notify({
      type: NotificationType.CURATOR_APPROVED,
      recipientsFn: () => [
        {recipientId: "real-user"},
        {recipientId: ""},
        {recipientId: "another-user"},
      ],
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    const [recipients] = mockCreateBatchNotifications.mock.calls[0];
    expect(recipients).toHaveLength(2);
    expect(recipients.every((r: any) => r.recipientId)).toBe(true);
  });

  it("should capture and pass the response body to recipientsFn via req._notificationResBody", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);

    const req = buildRequest();
    const res = buildResponse({statusCode: 200});

    let capturedBody: any;

    notify({
      type: NotificationType.MOLD_REPORT_RESOLVED,
      recipientsFn: (r, body) => {
        capturedBody = body;
        return [{recipientId: "user-from-body"}];
      },
    })(req, res, jest.fn());

    // Simulate res.json() being called with a response body
    res.json({id: "report-456", farmer_id: "farmer-abc"});

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(capturedBody).toEqual({id: "report-456", farmer_id: "farmer-abc"});
  });

  it("should pass referenceId from referenceIdFn to createBatchNotifications", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);

    const req = buildRequest({params: {id: "report-xyz"}});
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify({
      type: NotificationType.MOLD_REPORT_REJECTED,
      recipientsFn: () => [{recipientId: "farmer1"}],
      referenceIdFn: (r) => r.params.id,
      referenceType: "mold_report",
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    const [, , , referenceId, referenceType] = mockCreateBatchNotifications.mock.calls[0];
    expect(referenceId).toBe("report-xyz");
    expect(referenceType).toBe("mold_report");
  });

  it("should pass extra context from contextFn to createBatchNotifications", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);

    const req = buildRequest();
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify({
      type: NotificationType.MOLD_REPORT_ASSIGNED,
      recipientsFn: () => [{recipientId: "myco1"}],
      contextFn: () => ({case_name: "Basement Mold"}),
    })(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    const [, , context] = mockCreateBatchNotifications.mock.calls[0];
    expect(context).toMatchObject({case_name: "Basement Mold"});
  });

  it("should process multiple configs in an array independently", async () => {
    mockCreateBatchNotifications.mockResolvedValue(1);

    const req = buildRequest();
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify([
      {
        type: NotificationType.USER_DISABLED,
        recipientsFn: () => [{recipientId: "target-user"}],
      },
      {
        type: NotificationType.FLAG_REPORT_RESOLVED,
        recipientsFn: () => [{recipientId: "reporter-user"}],
      },
    ])(req, res, next);

    (res as any).emit("finish");
    await new Promise((r) => setImmediate(r));

    expect(mockCreateBatchNotifications).toHaveBeenCalledTimes(2);
  });

  it("should catch and swallow errors thrown by createBatchNotifications", async () => {
    mockCreateBatchNotifications.mockRejectedValue(new Error("service crash"));

    const req = buildRequest();
    const res = buildResponse({statusCode: 200});
    const next = jest.fn();

    notify({
      type: NotificationType.CURATOR_REJECTED,
      recipientsFn: () => [{recipientId: "user1"}],
    })(req, res, next);

    (res as any).emit("finish");

    // Should not throw
    await expect(new Promise((r) => setImmediate(r))).resolves.toBeUndefined();
  });
});
