/**
 * Per-test-file setup for integration tests.
 * Sets emulator environment variables so Firebase Admin SDK connects to emulators.
 */

// Ensure emulator env vars are set BEFORE any Firebase imports
// Use 127.0.0.1 instead of localhost to avoid Node.js IPv6 (::1) resolution issues
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.NODE_ENV = "test";
process.env.IS_TESTING = "true";
process.env.GOOGLE_CLOUD_PROJECT = "thesis-dev-project";
process.env.GCLOUD_PROJECT = "thesis-dev-project";
process.env.ENCRYPTION_KEY =
  "a3f5c9e7b2d4f8a1c6e3d9b7f0a2c4e6b1d8f3a7c9e2b6d4f1a3c7e9b5d0f2a6";
