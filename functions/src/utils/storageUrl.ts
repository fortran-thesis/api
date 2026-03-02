export interface ParsedStorageReference {
  bucketName?: string;
  filePath: string;
}

const GS_PREFIX = "gs://";

export const isHttpUrl = (value: string): boolean => {
  return value.startsWith("http://") || value.startsWith("https://");
};

export const toPrivateStorageUrl = (bucketName: string, filePath: string): string => {
  const normalizedPath = filePath.replace(/^\/+/, "");
  return `${GS_PREFIX}${bucketName}/${normalizedPath}`;
};

export const parseStorageReference = (
  value: string,
  fallbackBucket?: string
): ParsedStorageReference => {
  if (value.startsWith(GS_PREFIX)) {
    const withoutPrefix = value.slice(GS_PREFIX.length);
    const firstSlash = withoutPrefix.indexOf("/");

    if (firstSlash === -1) {
      return {
        bucketName: withoutPrefix || fallbackBucket,
        filePath: "",
      };
    }

    return {
      bucketName: withoutPrefix.slice(0, firstSlash),
      filePath: withoutPrefix.slice(firstSlash + 1),
    };
  }

  return {
    bucketName: fallbackBucket,
    filePath: value.replace(/^\/+/, ""),
  };
};
