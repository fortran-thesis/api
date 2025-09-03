import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { envOptions } from "./environment";

let firebaseConfig: any = {};

if (envOptions.isProd) {
  // Only use service account in production
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require("./firebase-config.json");
  firebaseConfig.credential = cert(serviceAccount);
}

// Initialize Firebase Admin SDK with service account
export const firebase = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
