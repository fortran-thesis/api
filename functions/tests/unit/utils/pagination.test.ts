import { describe, it, expect, jest } from "@jest/globals";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { paginateQuery } from "../../../src/utils/pagination";

jest.mock("../../../src/utils/dev");

describe("pagination utils (unit)", () => {
  describe("paginateQuery", () => {
    it("should paginate query without token", async () => {
      const mockDocs = [
        { id: "doc1", get: jest.fn((field) => "value1") },
        { id: "doc2", get: jest.fn((field) => "value2") },
      ];
      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const result = await paginateQuery(
        mockQuery,
        10,
        undefined,
        [FieldPath.documentId()]
      );

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toBeDefined();
      expect(result?.snapshot).toEqual(mockSnapshot);
      expect(result?.nextPageToken).toBeDefined();
    });

    it("should handle empty results", async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const result = await paginateQuery(mockQuery, 10);

      expect(result).toBeDefined();
      expect(result?.snapshot.empty).toBe(true);
      expect(result?.nextPageToken).toBeNull();
    });

    it("should use page token for pagination", async () => {
      const mockDocs = [
        { id: "doc3", get: jest.fn((field) => "value3") },
      ];
      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        startAfter: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      // Create a valid token
      const token = Buffer.from(JSON.stringify({ vals: ["doc2"] })).toString("base64");

      const result = await paginateQuery(
        mockQuery,
        10,
        token,
        [FieldPath.documentId()]
      );

      expect(result).toBeDefined();
      expect(result?.snapshot).toEqual(mockSnapshot);
    });

    it("should handle Timestamp values in pagination", async () => {
      const timestamp = Timestamp.now();
      const mockDocs = [
        {
          id: "doc1",
          get: jest.fn((field) => {
            if (field === "created_at") return timestamp;
            return "doc1";
          }),
        },
      ];
      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const result = await paginateQuery(
        mockQuery,
        10,
        undefined,
        ["created_at", FieldPath.documentId()]
      );

      expect(result).toBeDefined();
      expect(result?.nextPageToken).toBeDefined();
    });

    it("should return null on error", async () => {
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error("Query failed")),
      };

      const result = await paginateQuery(mockQuery, 10);

      expect(result).toBeNull();
    });

    it("should handle invalid page token gracefully", async () => {
      const mockDocs = [
        { id: "doc1", get: jest.fn((field) => "value1") },
      ];
      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const invalidToken = "invalid-base64!!!";

      const result = await paginateQuery(mockQuery, 10, invalidToken);

      expect(result).toBeDefined();
      expect(result?.snapshot).toEqual(mockSnapshot);
    });

    it("should handle multiple order fields", async () => {
      const mockDocs = [
        {
          id: "doc1",
          get: jest.fn((field) => {
            if (field === "name") return "Alice";
            if (field === "age") return 30;
            return "doc1";
          }),
        },
      ];
      const mockSnapshot = {
        empty: false,
        docs: mockDocs,
      };
      const mockQuery: any = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const result = await paginateQuery(
        mockQuery,
        10,
        undefined,
        ["name", "age", FieldPath.documentId()]
      );

      expect(result).toBeDefined();
      expect(result?.nextPageToken).toBeDefined();
    });
  });
});
