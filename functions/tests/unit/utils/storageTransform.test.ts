import {
  transformToSignedUrl,
  transformImageUrl,
  transformImageUrls,
  clearSignedUrlCache,
} from "../../../src/utils/storageTransform";
import * as storage from "../../../src/lib/storage";

jest.mock("../../../src/lib/storage");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/storage", () => ({
  getDefaultBucket: jest.fn(() => "thesis-2e701.firebasestorage.app"),
}));

const mockedGetSignedUrl = storage.getSignedUrl as jest.MockedFunction<typeof storage.getSignedUrl>;

describe("storageTransform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSignedUrlCache();
  });

  describe("transformToSignedUrl", () => {
    it("should return null for null input", async () => {
      const result = await transformToSignedUrl(null);
      expect(result).toBeNull();
    });

    it("should return null for undefined input", async () => {
      const result = await transformToSignedUrl(undefined);
      expect(result).toBeNull();
    });

    it("should transform file path to signed URL", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      const result = await transformToSignedUrl(filePath);

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath, 7200, "thesis-2e701.firebasestorage.app");
      expect(result).toBe(signedUrl);
    });

    it("should transform firebase private URL to signed URL", async () => {
      const privateUrl = "gs://thesis-2e701.firebasestorage.app/scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      const result = await transformToSignedUrl(privateUrl);

      expect(mockedGetSignedUrl).toHaveBeenCalledWith("scanned-molds/123_photo.jpg", 7200, "thesis-2e701.firebasestorage.app");
      expect(result).toBe(signedUrl);
    });

    it("should return cached signed URL on repeated calls", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      const first = await transformToSignedUrl(filePath);
      const second = await transformToSignedUrl(filePath);

      expect(first).toBe(signedUrl);
      expect(second).toBe(signedUrl);
      expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("should use custom expiration time", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      await transformToSignedUrl(filePath, 7200);

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath, 7200, "thesis-2e701.firebasestorage.app");
    });

    it("should return download URL if signed URL generation fails", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const expectedUrl = "https://firebasestorage.googleapis.com/v0/b/thesis-2e701.firebasestorage.app/o/scanned-molds%2F123_photo.jpg?alt=media";
      mockedGetSignedUrl.mockResolvedValue(null);

      const result = await transformToSignedUrl(filePath);

      expect(result).toBe(expectedUrl);
    });

    it("should return download URL on error", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const expectedUrl = "https://firebasestorage.googleapis.com/v0/b/thesis-2e701.firebasestorage.app/o/scanned-molds%2F123_photo.jpg?alt=media";
      mockedGetSignedUrl.mockRejectedValue(new Error("Storage error"));

      const result = await transformToSignedUrl(filePath);

      expect(result).toBe(expectedUrl);
    });

    it("should return existing public URL as-is", async () => {
      const publicUrl = "https://example.com/image.jpg";

      const result = await transformToSignedUrl(publicUrl);

      expect(result).toBe(publicUrl);
      expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe("transformImageUrl", () => {
    it("should return object unchanged if no image_url", async () => {
      const obj = {name: "Test", description: "Test description"} as any;
      const result = await transformImageUrl(obj);
      expect(result).toEqual(obj);
    });

    it("should return object unchanged if image_url is null", async () => {
      const obj = {name: "Test", image_url: null};
      const result = await transformImageUrl(obj);
      expect(result).toEqual(obj);
    });

    it("should transform image_url to signed URL", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      const obj = {name: "Test", image_url: filePath};
      const result = await transformImageUrl(obj);

      expect(result).toEqual({name: "Test", image_url: signedUrl});
    });

    it("should preserve all object properties", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      const obj = {
        id: "123",
        name: "Test",
        image_url: filePath,
        metadata: {created_at: new Date()},
      };
      const result = await transformImageUrl(obj);

      expect(result.id).toBe(obj.id);
      expect(result.name).toBe(obj.name);
      expect(result.image_url).toBe(signedUrl);
      expect(result.metadata).toBe(obj.metadata);
    });
  });

  describe("transformImageUrls", () => {
    it("should transform array of objects with image_url", async () => {
      const filePath1 = "scanned-molds/123_photo.jpg";
      const filePath2 = "scanned-molds/456_photo.jpg";
      const signedUrl1 = "https://storage.googleapis.com/signed-url-1";
      const signedUrl2 = "https://storage.googleapis.com/signed-url-2";

      mockedGetSignedUrl
        .mockResolvedValueOnce(signedUrl1)
        .mockResolvedValueOnce(signedUrl2);

      const items = [
        {name: "Test 1", image_url: filePath1},
        {name: "Test 2", image_url: filePath2},
      ];
      const result = await transformImageUrls(items);

      expect(result[0].image_url).toBe(signedUrl1);
      expect(result[1].image_url).toBe(signedUrl2);
    });

    it("should handle empty array", async () => {
      const result = await transformImageUrls([]);
      expect(result).toEqual([]);
    });

    it("should handle objects without image_url", async () => {
      const items = [
        {name: "Test 1"},
        {name: "Test 2"},
      ] as any[];
      const result = await transformImageUrls(items);

      expect(result).toEqual(items);
      expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    });

    it("should use custom expiration time for all items", async () => {
      const filePath1 = "scanned-molds/123_photo.jpg";
      const filePath2 = "scanned-molds/456_photo.jpg";
      mockedGetSignedUrl.mockResolvedValue("https://storage.googleapis.com/signed-url");

      const items = [
        {name: "Test 1", image_url: filePath1},
        {name: "Test 2", image_url: filePath2},
      ];
      await transformImageUrls(items, 7200);

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath1, 7200, "thesis-2e701.firebasestorage.app");
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath2, 7200, "thesis-2e701.firebasestorage.app");
    });
  });
});
