import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";

let firebaseConfig: any = {};

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  // Only use service account in production
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require("./firebase-config.json");
  firebaseConfig.credential = cert(serviceAccount);
}

// Initialize Firebase Admin SDK with service account
export const firebase = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
