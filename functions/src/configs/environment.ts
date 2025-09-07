import dotenv from "dotenv";
dotenv.config({quiet: process.env.NODE_ENV === 'test' ? true : false});

export const envOptions = {
  env: process.env.NODE_ENV || "development",
  port:
    process.env.NODE_ENV === "production"
      ? 3000
      : process.env.NODE_ENV === "test"
      ? 4000
      : 5001,
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test" || process.env.IS_TESTING === "true",
  isDev: process.env.NODE_ENV === "development",
  firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  firebaseStorageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  redisUsername: process.env.REDIS_USERNAME || null,
  redisPassword: process.env.REDIS_PASSWORD || null,
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxSessionAge: 60 * 60 * 24 * 5 * 1000, // 5 days
};