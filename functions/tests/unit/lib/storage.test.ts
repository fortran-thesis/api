import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Readable } from "stream";

// Mock file operations - must be defined before jest.mock calls
const mockFile: any = {
  save: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  getSignedUrl: jest.fn(),
  exists: jest.fn(),
};

const mockBucket: any = {
  file: jest.fn(() => mockFile),
  name: "thesis-2e701.firebasestorage.app",
};

const mockStorage: any = {
  bucket: jest.fn(() => mockBucket),
};

// Mock dependencies
jest.mock("../../../src/configs/firebase", () => ({
  firebase: {},
}));
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => mockStorage),
}));
jest.mock("../../../src/configs/storage", () => ({
  getDefaultBucket: jest.fn(() => "default-bucket"),
}));
jest.mock("../../../src/utils/dev");

// Import storage AFTER mocking
import * as storage from "../../../src/lib/storage";

describe("storage lib (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBucket.file.mockReturnValue(mockFile);
    mockStorage.bucket.mockReturnValue(mockBucket);
  });

  describe("getFileRef", () => {
    it("should return a file reference", () => {
      const filePath = "test/path/file.jpg";
      const fileRef = storage.getFileRef(filePath);
      
      expect(mockBucket.file).toHaveBeenCalledWith(filePath);
      expect(fileRef).toBeDefined();
    });

    it("should use custom bucket name", () => {
      const filePath = "test/file.jpg";
      storage.getFileRef(filePath, "custom-bucket");
      
      expect(mockBucket.file).toHaveBeenCalledWith(filePath);
    });

    it("should parse gs:// private URL into bucket + path", () => {
      const privateUrl = "gs://private-bucket/path/to/file.jpg";

      storage.getFileRef(privateUrl);

      expect(mockStorage.bucket).toHaveBeenCalledWith("private-bucket");
      expect(mockBucket.file).toHaveBeenCalledWith("path/to/file.jpg");
    });
  });

  describe("uploadFile", () => {
    it("should upload a buffer successfully and return file path", async () => {
      const buffer = Buffer.from("test data");
      const filePath = "uploads/test.txt";
      mockFile.save.mockResolvedValue(undefined);

      const result = await storage.uploadFile(filePath, buffer, "text/plain");

      expect(mockFile.save).toHaveBeenCalledWith(
        buffer,
        { metadata: { contentType: "text/plain" } }
      );
      expect(result).toBe("gs://default-bucket/uploads/test.txt");
    });

    it("should upload without content type", async () => {
      const buffer = Buffer.from("test");
      mockFile.save.mockResolvedValue(undefined);

      const result = await storage.uploadFile("test.txt", buffer);

      expect(mockFile.save).toHaveBeenCalledWith(buffer, {});
      expect(result).toBe("gs://default-bucket/test.txt");
    });

    it("should return null on error", async () => {
      mockFile.save.mockRejectedValue(new Error("Upload failed"));

      const result = await storage.uploadFile("test.txt", Buffer.from("data"));

      expect(result).toBeNull();
    });

    it("should upload a stream", async () => {
      const stream = Readable.from(["test", "data"]);
      mockFile.save.mockResolvedValue(undefined);

      const result = await storage.uploadFile("test.txt", stream);

      expect(mockFile.save).toHaveBeenCalled();
      expect(result).toBe("gs://default-bucket/test.txt");
    });
  });

  describe("uploadFiles", () => {
    it("should upload multiple files and return file paths", async () => {
      const files = [
        {
          buffer: Buffer.from("file1"),
          originalname: "file1.jpg",
          mimetype: "image/jpeg",
        },
        {
          buffer: Buffer.from("file2"),
          originalname: "file2.jpg",
          mimetype: "image/jpeg",
        },
      ] as Express.Multer.File[];

      mockFile.save.mockResolvedValue(undefined);

      const result = await storage.uploadFiles(files, "test-folder");

      expect(result).toHaveLength(2);
      expect(result[0]).toContain("test-folder/");
      expect(result[0]).toContain("file1.jpg");
      expect(mockFile.save).toHaveBeenCalledTimes(2);
    });

    it("should handle upload failures gracefully", async () => {
      const files = [
        {
          buffer: Buffer.from("file1"),
          originalname: "file1.jpg",
          mimetype: "image/jpeg",
        },
      ] as Express.Multer.File[];

      mockFile.save.mockRejectedValue(new Error("Upload failed"));

      const result = await storage.uploadFiles(files, "folder");

      expect(result).toHaveLength(0);
    });
  });

  describe("downloadFile", () => {
    it("should download file successfully", async () => {
      const fileContent = Buffer.from("file content");
      mockFile.download.mockResolvedValue([fileContent]);

      const result = await storage.downloadFile("test.txt");

      expect(mockFile.download).toHaveBeenCalled();
      expect(result).toEqual(fileContent);
    });

    it("should return null on error", async () => {
      mockFile.download.mockRejectedValue(new Error("Download failed"));

      const result = await storage.downloadFile("test.txt");

      expect(result).toBeNull();
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      mockFile.delete.mockResolvedValue(undefined);

      const result = await storage.deleteFile("test.txt");

      expect(mockFile.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mockFile.delete.mockRejectedValue(new Error("Delete failed"));

      const result = await storage.deleteFile("test.txt");

      expect(result).toBe(false);
    });
  });

  describe("getSignedUrl", () => {
    it("should generate signed URL successfully", async () => {
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockFile.getSignedUrl.mockResolvedValue([signedUrl]);

      const result = await storage.getSignedUrl("test.txt");

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        action: "read",
        expires: expect.any(Number),
      });
      expect(result).toBe(signedUrl);
    });

    it("should use custom expiration time", async () => {
      const signedUrl = "https://signed-url";
      mockFile.getSignedUrl.mockResolvedValue([signedUrl]);

      await storage.getSignedUrl("test.txt", 7200);

      expect(mockFile.getSignedUrl).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockFile.getSignedUrl.mockRejectedValue(new Error("Signing failed"));

      const result = await storage.getSignedUrl("test.txt");

      expect(result).toBeNull();
    });
    
    it("should return null if file does not exist", async () => {
      const notFoundError: any = new Error("No such object");
      notFoundError.code = 404;
      mockFile.getSignedUrl.mockRejectedValue(notFoundError);

      const result = await storage.getSignedUrl("nonexistent.txt");

      expect(mockFile.getSignedUrl).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
