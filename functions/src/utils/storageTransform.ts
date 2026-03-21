import {getSignedUrl} from "../lib/storage";
import {devLog} from "./dev";
import {LRUCache} from "lru-cache";
import {isHttpUrl, parseStorageReference} from "./storageUrl";
import {getDefaultBucket} from "../configs/storage";
import {getFileRef} from "../lib/storage";
import {randomUUID} from "crypto";

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

  // Ensure filePath is actually a string (not an object like Timestamp)
  if (typeof filePath !== "string") {
    devLog(`transformToSignedUrl: filePath is not a string, type=${typeof filePath}, returning null`);
    return null;
  }

  // If it's already a URL (absolute path starting with http/https), return as-is
  if (isHttpUrl(filePath)) {
    devLog("transformToSignedUrl: Input is already a URL, returning as-is");
    return filePath;
  }

  const parsed = parseStorageReference(filePath, getDefaultBucket());
  if (!parsed.filePath) return filePath;

  const bucket = parsed.bucketName || getDefaultBucket();
  const encodedPath = encodeURIComponent(parsed.filePath);

  // Helper: Firebase Storage REST download URL
  const toDownloadUrl = (host: string, protocol: string) =>
    `${protocol}://${host}/v0/b/${bucket}/o/${encodedPath}?alt=media`;

  // When the Firebase Storage emulator is active, signed URLs are not supported.
  // Return a tokenized direct media URL so browser image tags can load without
  // attaching auth headers. If token metadata is missing, create one.
  const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (storageEmulatorHost) {
    try {
      const file = getFileRef(parsed.filePath, bucket);
      const [metadata] = await file.getMetadata();
      const rawTokens = metadata?.metadata?.firebaseStorageDownloadTokens;
      const existingToken =
        (typeof rawTokens === "string" ? rawTokens : "")
          .split(",")
          .map((token: string) => token.trim())
          .find(Boolean);

      let downloadToken = existingToken;
      if (!downloadToken) {
        downloadToken = randomUUID();
        await file.setMetadata({
          metadata: {
            ...(metadata?.metadata || {}),
            firebaseStorageDownloadTokens: downloadToken,
          },
        });
      }

      const emulatorPort = storageEmulatorHost.split(":")[1] || "9199";
      const emulatorHostForBrowser = `localhost:${emulatorPort}`;

      const emulatorDownloadUrl = `${toDownloadUrl(emulatorHostForBrowser, "http")}&token=${encodeURIComponent(downloadToken)}`;
      devLog(`transformToSignedUrl: Emulator mode — returning tokenized URL: ${emulatorDownloadUrl}`);
      return emulatorDownloadUrl;
    } catch (error) {
      devLog(`transformToSignedUrl: Emulator token URL failed, falling back to direct media URL: ${error}`);
      const emulatorPort = storageEmulatorHost.split(":")[1] || "9199";
      const emulatorHostForBrowser = `localhost:${emulatorPort}`;
      const emulatorDownloadUrl = toDownloadUrl(emulatorHostForBrowser, "http");
      return emulatorDownloadUrl;
    }
  }

  const cacheKey = `${bucket}:${parsed.filePath}:${expiresInSeconds}`;
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
      // Cache this signed URL with a TTL that matches the signed URL expiry
      // so cache entries don't outlive the URL or linger much longer.
      signedUrlCache.set(cacheKey, signedUrl, {ttl: expiresInSeconds * 1000});
      return signedUrl;
    }
    // Signed URL generation returned null (file not found)
  } catch (error) {
    devLog(`Failed to generate signed URL for: ${filePath}, falling back to download URL`);
  }

  // Fallback: Firebase Storage public download URL.
  // Always better than returning a raw gs:// URI that no browser can load.
  const downloadUrl = toDownloadUrl("firebasestorage.googleapis.com", "https");
  devLog(`transformToSignedUrl: Falling back to download URL: ${downloadUrl}`);
  return downloadUrl;
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
