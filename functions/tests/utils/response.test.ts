import {sendError, sendSuccess} from "../../src/utils/response";
import {describe, it, expect, jest} from "@jest/globals";

describe("response utils (unit)", () => {
  it("should send success response", () => {
    const mockRes = {json: jest.fn(), status: jest.fn().mockReturnThis()};
    sendSuccess(mockRes as any, {foo: "bar"}, 201);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      {success: true, data: {foo: "bar"}}
    );
  });

  it("should send error response", () => {
    const mockRes = {json: jest.fn(), status: jest.fn().mockReturnThis()};
    sendError(mockRes as any, "Something went wrong", 400);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      {success: false, error: "Something went wrong"}
    );
  });
});
