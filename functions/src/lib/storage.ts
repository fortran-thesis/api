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
 * @param filePath - The destination path in the bucket
 * @param data - The buffer or stream to upload
 * @param contentType - (Optional) The MIME type of the file
 */
export const uploadFile = async (
  filePath: string,
  data: Buffer | Readable,
  contentType?: string,
  bucketName?: string
): Promise<string | null> => {
  try {
    const file = getFileRef(filePath, bucketName);
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
  folder: string,
  bucketName?: string
): Promise<string[]> => {
  const filePaths: string[] = [];
  for (const file of files) {
    const filePath = `${folder}/${Date.now()}_${file.originalname}`;
    const uploadedPath = await uploadFile(
      filePath,
      file.buffer,
      file.mimetype,
      bucketName
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
 * @return The signed URL as a string
 */
export const getSignedUrl = async (
  filePath: string,
  expiresInSeconds = 3600,
  bucketName?: string
): Promise<string | null> => {
  try {
    const file = getFileRef(filePath, bucketName);
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
