import {firebase} from "../configs/firebase";
import {getStorage} from "firebase-admin/storage";
import {Bucket, File} from "@google-cloud/storage";
import {Readable} from "stream";
import {devLog} from "../utils/dev";

const storage = getStorage(firebase);

const callBucket = (bucketName: string): Bucket => storage.bucket(bucketName);

/**
 * Returns a reference to a file in the default bucket.
 * @param filePath - The path to the file in the bucket
 */
export const getFileRef = (bucketName: string, filePath: string): File => {
  return callBucket(bucketName).file(filePath);
};

/**
 * Uploads a buffer or stream to the specified file path in the bucket.
 * @param filePath - The destination path in the bucket
 * @param data - The buffer or stream to upload
 * @param contentType - (Optional) The MIME type of the file
 */
export const uploadFile = async (
  bucketName: string,
  filePath: string,
  data: Buffer | Readable,
  contentType?: string
): Promise<string | null> => {
  try {
    const file = getFileRef(bucketName, filePath);
    const options: any = {};
    if (contentType) options.metadata = {contentType};
    await file.save(data, options);
    return filePath;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const uploadFiles = async (
  files: Express.Multer.File[],
  bucketName: string
): Promise<string[]> => {
  const filePaths: string[] = [];
  for (const file of files) {
    const filePath = `molds/${Date.now()}_${file.originalname}`;
    const uploadedPath = await uploadFile(
      bucketName,
      filePath,
      file.buffer,
      file.mimetype
    );
    if (uploadedPath) filePaths.push(uploadedPath);
  }
  return filePaths;
};

/**
 * Downloads a file from the bucket as a buffer.
 * @param filePath - The path to the file in the bucket
 * @return The file contents as a Buffer
 */
export const downloadFile = async (
  bucketName: string,
  filePath: string
): Promise<Buffer | null> => {
  try {
    const file = getFileRef(bucketName, filePath);
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
  bucketName: string,
  filePath: string
): Promise<boolean> => {
  try {
    const file = getFileRef(bucketName, filePath);
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
 * @return The signed URL as a string
 */
export const getSignedUrl = async (
  bucketName: string,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> => {
  try {
    const file = getFileRef(bucketName, filePath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInSeconds * 1000,
    });
    return url;
  } catch (error) {
    devLog(error);
    return null;
  }
};
