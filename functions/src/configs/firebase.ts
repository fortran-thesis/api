import {initializeApp, cert, getApps, getApp} from "firebase-admin/app";
import {envOptions} from "./environment";
import {getDefaultBucket} from "./storage";

const firebaseConfig: any = {
  storageBucket: getDefaultBucket(), // Add default storage bucket
};

// Only use service account file in local development or emulator
// In production (Cloud Functions/Cloud Run), Firebase SDK auto-initializes
if (!envOptions.isProd && !process.env.FUNCTIONS_EMULATOR) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require("./firebase-config.json");
    firebaseConfig.credential = cert(serviceAccount);
  } catch (error) {
    console.warn("firebase-config.json not found, using default credentials");
  }
}

// Initialize Firebase Admin SDK
export const firebase = !getApps().length ?
  initializeApp(firebaseConfig) :
  getApp();
