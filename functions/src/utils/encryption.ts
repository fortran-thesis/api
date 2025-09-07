import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { envOptions } from "../configs/environment";
const algorithm = "aes-256-cbc";

// Validate ENCRYPTION_KEY existence and length
const encryptionKey = envOptions.encryptionKey;
if (!encryptionKey) {
  throw new Error("ENCRYPTION_KEY environment variable is not set.");
}
if (encryptionKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKey)) {
  throw new Error("ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).");
}
const key = Buffer.from(encryptionKey, "hex"); // 32 bytes
export const encrypt = (data: Buffer): { iv: string; encrypted: string } => {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return { iv: iv.toString("hex"), encrypted: encrypted.toString("hex") };
};

export const decrypt = (encrypted: string, iv: string): Buffer => {
  const decipher = createDecipheriv(algorithm, key, Buffer.from(iv, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]);
};
