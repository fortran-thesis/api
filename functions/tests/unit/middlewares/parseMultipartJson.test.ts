import { describe, it, expect, jest } from "@jest/globals";
import { parseMultipartJson } from "../../../src/middlewares/parseMultipartJson";

describe("parseMultipartJson middleware (unit)", () => {
  it("should parse JSON string fields", () => {
    const req = {
      body: {
        details: '{"name":"John","age":30}',
        other: "regular string",
      },
      headers: { "content-type": "multipart/form-data" },
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["details"])(req as any, res as any, next);

    expect(req.body.name).toBe("John");
    expect(req.body.age).toBe(30);
    expect(req.body.details).toBeUndefined(); // Promoted to root
    expect(req.body.other).toBe("regular string");
    expect(next).toHaveBeenCalled();
  });

  it("should handle multiple JSON fields", () => {
    const req = {
      body: {
        field1: '{"key1":"value1"}',
        field2: '{"key2":"value2"}',
      },
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["field1", "field2"])(req as any, res as any, next);

    expect(req.body.key1).toBe("value1");
    expect(req.body.key2).toBe("value2");
    expect(next).toHaveBeenCalled();
  });

  it("should leave invalid JSON strings as-is", () => {
    const req = {
      body: {
        details: "not valid json",
      },
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["details"])(req as any, res as any, next);

    expect(req.body.details).toBe("not valid json");
    expect(next).toHaveBeenCalled();
  });

  it("should handle missing fields gracefully", () => {
    const req = {
      body: {
        other: "value",
      },
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["nonexistent"])(req as any, res as any, next);

    expect(req.body.other).toBe("value");
    expect(next).toHaveBeenCalled();
  });

  it("should handle empty body", () => {
    const req = {
      body: {},
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["details"])(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("should handle no body at all", () => {
    const req = {
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["details"])(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("should keep non-object JSON values as-is", () => {
    const req = {
      body: {
        arrayField: "[1,2,3]",
        stringField: '"just a string"',
      },
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["arrayField", "stringField"])(
      req as any,
      res as any,
      next
    );

    expect(req.body.arrayField).toEqual([1, 2, 3]);
    expect(req.body.stringField).toBe("just a string");
    expect(next).toHaveBeenCalled();
  });

  it("should handle nested JSON objects", () => {
    const req = {
      body: {
        details: '{"user":{"name":"Jane","roles":["admin","user"]}}',
      },
      headers: {},
    };
    const res = {};
    const next = jest.fn();

    parseMultipartJson(["details"])(req as any, res as any, next);

    expect(req.body.user).toEqual({ name: "Jane", roles: ["admin", "user"] });
    expect(next).toHaveBeenCalled();
  });
});
