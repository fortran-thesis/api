import {getSignedUrl} from "../lib/storage";
import {devLog} from "./dev";

/**
 * Transforms a storage file path to a signed URL
 * @param filePath - The file path stored in the database
 * @param expiresInSeconds - How long the URL should be valid (default: 1 hour)
 * @returns The signed URL or the original path if transformation fails
 */
export const transformToSignedUrl = async (
  filePath: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> => {
  if (!filePath) return null;
  
  try {
    const signedUrl = await getSignedUrl(filePath, expiresInSeconds);
    return signedUrl || filePath; // Fallback to original path if signed URL fails
  } catch (error) {
    devLog(`Failed to generate signed URL for: ${filePath}`);
    return filePath; // Return original path as fallback
  }
};

/**
 * Transforms an object with image_url field to use signed URLs
 * @param obj - Object containing image_url field
 * @param expiresInSeconds - How long the URL should be valid (default: 1 hour)
 * @returns Object with image_url transformed to signed URL
 */
export const transformImageUrl = async <T extends {image_url?: string | null}>(
  obj: T,
  expiresInSeconds = 3600
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
 * @param expiresInSeconds - How long the URLs should be valid (default: 1 hour)
 * @returns Array with all image_url fields transformed to signed URLs
 */
export const transformImageUrls = async <T extends {image_url?: string | null}>(
  items: T[],
  expiresInSeconds = 3600
): Promise<T[]> => {
  return Promise.all(
    items.map((item) => transformImageUrl(item, expiresInSeconds))
  );
};
