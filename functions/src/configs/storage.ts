/**
 * Storage bucket configuration
 * Organizes files by resource type within the Firebase Storage bucket
 */
export enum StorageFolder {
  MOLD_REPORTS = "mold-reports",
  MONITORED_MOLDS = "monitored-molds",
  USERS = "users",
  MOLDIPEDIA = "moldipedia",
  SCANNED_MOLDS = "scanned-molds",
  CULTIVATION_LOGS = "cultivation-logs",
  TEMP = "temp",
}

/**
 * Get the default Firebase Storage bucket name
 * Format: project-id.firebasestorage.app
 */
export const getDefaultBucket = (): string => {
  // Firebase default bucket format
  return "thesis-2e701.firebasestorage.app";
};

/**
 * Generate a storage path for a file
 * @param folder - The folder/resource type
 * @param fileName - The file name
 * @returns Full path: folder/timestamp_filename
 */
export const generateStoragePath = (folder: StorageFolder, fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${folder}/${timestamp}_${sanitizedFileName}`;
};

/**
 * Extract folder from a storage path
 * @param path - Full storage path
 * @returns Folder name
 */
export const getFolderFromPath = (path: string): string => {
  return path.split("/")[0];
};
