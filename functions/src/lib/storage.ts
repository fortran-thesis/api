import {firebase} from "../configs/firebase";
import {getStorage} from "firebase-admin/storage";
import {Bucket, File} from "@google-cloud/storage";
import {Readable} from "stream";
import {devLog} from "../utils/dev";
import {getDefaultBucket} from "../configs/storage";

const storage = getStorage(firebase);

const callBucket = (bucketName: string = getDefaultBucket()): Bucket => storage.bucket(bucketName);

/**
 * Returns a reference to a file in the default bucket.
 * @param filePath - The path to the file in the bucket
 */
export const getFileRef = (filePath: string, bucketName?: string): File => {
  return callBucket(bucketName).file(filePath);
};

/**
 * Uploads a buffer or stream to the specified file path in the bucket.
 * Returns the file path (to be stored in DB and used with getSignedUrl later).
 * @param filePath - The destination path in the bucket
 * @param data - The buffer or stream to upload
 * @param contentType - (Optional) The MIME type of the file
 * @returns The file path in storage, or null on error
 */
export const uploadFile = async (
  filePath: string,
  data: Buffer | Readable,
  contentType?: string,
  bucketName?: string
): Promise<string | null> => {
  try {
    console.log(`[uploadFile] Starting: ${filePath} (size: ${data instanceof Buffer ? data.length : "?"} bytes)`);
    devLog(`uploadFile: Starting upload to: ${filePath} (contentType: ${contentType})`);

    const file = getFileRef(filePath, bucketName);
    const options: any = {};
    if (contentType) options.metadata = {contentType};

    const startTime = Date.now();
    await file.save(data, options);
    const duration = Date.now() - startTime;

    console.log(`[uploadFile] ✅ Saved in ${duration}ms: ${filePath}`);
    devLog(`uploadFile: ✅ File saved successfully: ${filePath}`);

    // Return the file path (to be stored in DB)
    // Use getSignedUrl() when you need to display/access the file
    return filePath;
  } catch (error) {
    console.error(`[uploadFile] ❌ Error: ${filePath}`, error);
    devLog(`uploadFile: ❌ Error uploading to ${filePath}: ${error}`);
    devLog(error);
    return null;
  }
};

export const uploadFiles = async (
  files: Express.Multer.File[],
  folder: string,
  bucketName?: string
): Promise<string[]> => {
  console.log(`[uploadFiles] Starting upload for ${files.length} files to folder: ${folder}`);
  devLog(`uploadFiles: Starting upload for ${files.length} files to folder: ${folder}`);

  // Upload all files in parallel for better performance
  const uploadPromises = files.map(async (file) => {
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}_${file.originalname}`;
    console.log(`[uploadFiles] Uploading file to: ${filePath} (size: ${file.buffer.length} bytes)`);
    devLog(`uploadFiles: Uploading file to: ${filePath} (size: ${file.buffer.length} bytes, mime: ${file.mimetype})`);

    try {
      const uploadedPath = await uploadFile(
        filePath,
        file.buffer,
        file.mimetype,
        bucketName
      );
      if (uploadedPath) {
        console.log(`[uploadFiles] ✅ File uploaded: ${uploadedPath}`);
        devLog(`uploadFiles: ✅ File uploaded successfully: ${uploadedPath}`);
        return uploadedPath;
      } else {
        console.error(`[uploadFiles] ❌ File upload returned null for: ${filePath}`);
        devLog(`uploadFiles: ❌ File upload failed for: ${filePath}`);
        return null;
      }
    } catch (error) {
      console.error(`[uploadFiles] ❌ Error uploading ${filePath}:`, error);
      devLog(`uploadFiles: ❌ Error uploading ${filePath}: ${error}`);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  const filePaths = results.filter((path) => path !== null) as string[];
  console.log(`[uploadFiles] ✅ Upload complete - ${filePaths.length}/${files.length} files succeeded`);
  devLog(`uploadFiles: ✅ Upload complete - ${filePaths.length}/${files.length} files succeeded`);
  return filePaths;
};

/**
 * Downloads a file from the bucket as a buffer.
 * @param filePath - The path to the file in the bucket
 * @return The file contents as a Buffer
 */
export const downloadFile = async (
  filePath: string,
  bucketName?: string
): Promise<Buffer | null> => {
  try {
    const file = getFileRef(filePath, bucketName);
    const [contents] = await file.download();
    return contents;
  } catch (error) {
    devLog(error);
    return null;
  }
};

/**
 * Deletes a file from the bucket.
 * @param filePath - The path to the file in the bucket
 */
export const deleteFile = async (
  filePath: string,
  bucketName?: string
): Promise<boolean> => {
  try {
    const file = getFileRef(filePath, bucketName);
    await file.delete();
    return true;
  } catch (error) {
    devLog(error);
    return false;
  }
};

/**
 * Gets a signed URL for a file (for temporary public access).
 * @param filePath - The path to the file in the bucket
 * @param expiresInSeconds - How long the URL should be valid (default: 1 hour)
 * @param bucketName - Optional bucket name (defaults to configured bucket)
 * @return The signed URL as a string
 */
export const getSignedUrl = async (
  filePath: string,
  expiresInSeconds = 3600,
  bucketName?: string
): Promise<string | null> => {
  try {
    devLog(`getSignedUrl: Attempting to generate URL for: ${filePath}`);
    const file = getFileRef(filePath, bucketName);

    // Check if file exists first
    const [exists] = await file.exists();
    devLog(`getSignedUrl: File exists check for '${filePath}': ${exists ? "EXISTS" : "NOT_FOUND"}`);

    if (!exists) {
      devLog(`getSignedUrl: ❌ File does not exist: ${filePath}`);
      return null;
    }

    // Generate signed URL with explicit expiration date
    const expirationTime = Date.now() + expiresInSeconds * 1000;
    devLog(`getSignedUrl: Generating signed URL, expires in ${expiresInSeconds}s (${new Date(expirationTime).toISOString()})`);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: expirationTime,
    });
    devLog(`getSignedUrl: ✅ Successfully generated signed URL (${url.substring(0, 50)}...)`);
    return url;
  } catch (error) {
    devLog(`getSignedUrl: ❌ Error generating signed URL for ${filePath}: ${error}`);
    return null;
  }
};
