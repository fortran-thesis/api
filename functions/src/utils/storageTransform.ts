import {getSignedUrl} from "../lib/storage";
import {devLog} from "./dev";
import {LRUCache} from "lru-cache";
import {isHttpUrl, parseStorageReference} from "./storageUrl";
import {getDefaultBucket} from "../configs/storage";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 7200;
const signedUrlCache = new LRUCache<string, string>({
  max: 2000,
  ttl: DEFAULT_SIGNED_URL_TTL_SECONDS * 1000,
});

export const clearSignedUrlCache = (): void => {
  signedUrlCache.clear();
};

/**
 * Transforms a storage file reference to a signed URL
 * @param filePath - A storage path, Firebase private URL (gs://), or already-public URL
 * @param expiresInSeconds - How long the URL should be valid (default: 2 hours)
 * @returns The signed URL or the original path if transformation fails
 */
export const transformToSignedUrl = async (
  filePath: string | null | undefined,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> => {
  if (!filePath) return null;

  // If it's already a URL (absolute path starting with http/https), return as-is
  if (isHttpUrl(filePath)) {
    devLog("transformToSignedUrl: Input is already a URL, returning as-is");
    return filePath;
  }

  const parsed = parseStorageReference(filePath, getDefaultBucket());
  if (!parsed.filePath) return filePath;

  const cacheKey = `${parsed.bucketName || "default-bucket"}:${parsed.filePath}:${expiresInSeconds}`;
  const cachedSignedUrl = signedUrlCache.get(cacheKey);
  if (cachedSignedUrl) {
    return cachedSignedUrl;
  }

  try {
    const signedUrl = await getSignedUrl(
      parsed.filePath,
      expiresInSeconds,
      parsed.bucketName
    );
    if (signedUrl) {
      signedUrlCache.set(cacheKey, signedUrl);
      return signedUrl;
    }
    return filePath;
  } catch (error) {
    devLog(`Failed to generate signed URL for: ${filePath}`);
    return filePath; // Return original path as fallback
  }
};

/**
 * Transforms an object with image_url field to use signed URLs
 * @param obj - Object containing image_url field
 * @param expiresInSeconds - How long the URL should be valid (default: 2 hours)
 * @returns Object with image_url transformed to signed URL
 */
export const transformImageUrl = async <T extends {image_url?: string | null}>(
  obj: T,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<T> => {
  if (!obj.image_url) return obj;

  const signedUrl = await transformToSignedUrl(obj.image_url, expiresInSeconds);
  return {
    ...obj,
    image_url: signedUrl,
  };
};

/**
 * Transforms an array of objects with image_url fields to use signed URLs
 * @param items - Array of objects containing image_url fields
 * @param expiresInSeconds - How long the URLs should be valid (default: 2 hours)
 * @returns Array with all image_url fields transformed to signed URLs
 */
export const transformImageUrls = async <T extends {image_url?: string | null}>(
  items: T[],
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<T[]> => {
  return Promise.all(
    items.map((item) => transformImageUrl(item, expiresInSeconds))
  );
};
