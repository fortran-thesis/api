import { describe, it, expect, jest } from "@jest/globals";
import { cloudRunMultipartFix } from "../../../src/middlewares/cloudRunMultipartFix";

describe("cloudRunMultipartFix middleware (unit)", () => {
  it("should skip non-multipart requests", () => {
    const req = {
      headers: { "content-type": "application/json" },
      readable: true,
      readableEnded: false,
    };
    const res = {};
    const next = jest.fn();

    cloudRunMultipartFix(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("should continue if stream is still readable", () => {
    const req = {
      headers: { "content-type": "multipart/form-data; boundary=----" },
      readable: true,
      readableEnded: false,
    };
    const res = {};
    const next = jest.fn();

    cloudRunMultipartFix(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("should handle consumed stream with rawBody", (done) => {
    const rawBody = Buffer.from(
      '------\r\n' +
      'Content-Disposition: form-data; name="field"\r\n\r\n' +
      'value\r\n' +
      '------\r\n' +
      'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n' +
      'file content\r\n' +
      '--------\r\n'
    );

    const req = {
      headers: { 
        "content-type": "multipart/form-data; boundary=----",
        "content-length": rawBody.length.toString(),
      },
      readable: false,
      readableEnded: true,
      rawBody: rawBody,
      body: {},
    };
    const res = {};
    const next = jest.fn(() => {
      try {
        expect(req.body).toBeDefined();
        done();
      } catch (err: any) {
        done(err);
      }
    });

    cloudRunMultipartFix(req as any, res as any, next);
  });

  it("should error if stream consumed without rawBody", () => {
    const req = {
      headers: { "content-type": "multipart/form-data; boundary=----" },
      readable: false,
      readableEnded: true,
      rawBody: null,
    };
    const res = {};
    const next = jest.fn();

    cloudRunMultipartFix(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Request stream consumed without rawBody",
      })
    );
  });

  it("should handle non-buffer rawBody", () => {
    const req = {
      headers: { "content-type": "multipart/form-data; boundary=----" },
      readable: false,
      readableEnded: true,
      rawBody: "string instead of buffer",
    };
    const res = {};
    const next = jest.fn();

    cloudRunMultipartFix(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Request stream consumed without rawBody",
      })
    );
  });
});
