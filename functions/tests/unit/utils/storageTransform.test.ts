import {
  transformToSignedUrl,
  transformImageUrl,
  transformImageUrls,
} from "../../../src/utils/storageTransform";
import * as storage from "../../../src/lib/storage";

jest.mock("../../../src/lib/storage");
jest.mock("../../../src/utils/dev");

const mockedGetSignedUrl = storage.getSignedUrl as jest.MockedFunction<typeof storage.getSignedUrl>;

describe("storageTransform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath, 3600);
      expect(result).toBe(signedUrl);
    });

    it("should use custom expiration time", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      const signedUrl = "https://storage.googleapis.com/signed-url";
      mockedGetSignedUrl.mockResolvedValue(signedUrl);

      await transformToSignedUrl(filePath, 7200);

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath, 7200);
    });

    it("should return original path if signed URL generation fails", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      mockedGetSignedUrl.mockResolvedValue(null);

      const result = await transformToSignedUrl(filePath);

      expect(result).toBe(filePath);
    });

    it("should return original path on error", async () => {
      const filePath = "scanned-molds/123_photo.jpg";
      mockedGetSignedUrl.mockRejectedValue(new Error("Storage error"));

      const result = await transformToSignedUrl(filePath);

      expect(result).toBe(filePath);
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

      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath1, 7200);
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(filePath2, 7200);
    });
  });
});
