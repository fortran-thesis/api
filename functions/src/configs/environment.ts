import dotenv from "dotenv";
// Only load .env file in local development (not in Cloud Run/production)
if (process.env.NODE_ENV !== "production") {
  dotenv.config({quiet: process.env.NODE_ENV === "test" ? true : false});
}

export const envOptions = {
  env: process.env.NODE_ENV || "development",
  port:
    process.env.NODE_ENV === "production" ?
      8080 :
      process.env.NODE_ENV === "test" ?
        4000 :
        5001,
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test" || process.env.IS_TESTING === "true",
  isDev: process.env.NODE_ENV === "development",
  // Cloud Run / Firebase Functions v2 runtime signals
  isCloudRun: Boolean(
    process.env.K_SERVICE ||
      process.env.K_REVISION ||
      process.env.FUNCTION_TARGET ||
      process.env.FUNCTION_SIGNATURE_TYPE
  ),
  firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  firebaseStorageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  redisUsername: process.env.REDIS_USERNAME || null,
  redisPassword: process.env.REDIS_PASSWORD || null,
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  moldifyEmail: process.env.MOLDIFY_EMAIL,
  moldifyPassword: process.env.MOLDIFY_PASSWORD,
  encryptionKey: process.env.ENCRYPTION_KEY,
  clientApi: process.env.THESIS_FIREBASE_CLIENT_API,
  projectApiKey: process.env.MAIN_PROJECT_API_KEY,
  maxSessionAge: 60 * 60 * 24 * 5 * 1000, // 5 days
};
