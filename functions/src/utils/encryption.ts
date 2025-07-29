import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import dotenv from "dotenv";
dotenv.config();

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

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
