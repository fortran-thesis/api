import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../src/middlewares/validation";
import {describe, it, expect, jest} from "@jest/globals";
import {z} from "zod";

describe("validation middleware", () => {
  const schema = z.object({name: z.string()});

  it("should call next if body is valid", () => {
    const req = {body: {name: "John"}};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();
    validateBody(schema)(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({name: "John"});
  });

  it("should send error if body is invalid", () => {
    const req = {body: {name: 123}};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();
    validateBody(schema)(req as any, res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it("should validate params", () => {
    const req = {params: {name: "Jane"}};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();
    validateParams(schema)(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.params).toEqual({name: "Jane"});
  });

  it("should validate query", () => {
    const req = {query: {name: "Jane"}};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();
    validateQuery(schema)(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({name: "Jane"});
  });

  it("should handle missing body data gracefully", () => {
    const req = {body: undefined};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();
    validateBody(schema)(req as any, res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("Required"),
    });
  });

  it("should validate complex nested schema", () => {
    const complexSchema = z.object({
      user: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18),
      }),
      tags: z.array(z.string()).optional(),
    });

    const validReq = {
      body: {
        user: {name: "John Doe", email: "john@example.com", age: 25},
        tags: ["admin", "user"],
      },
    };
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const next = jest.fn();

    validateBody(complexSchema)(validReq as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(validReq.body).toEqual({
      user: {name: "John Doe", email: "john@example.com", age: 25},
      tags: ["admin", "user"],
    });
  });
});
