import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import serviceAccount from "./firebase-config.json";



// Initialize Firebase Admin SDK with service account
export const firebase = !getApps().length
  ? initializeApp({
      credential: cert(serviceAccount as any),
    })
  : getApp();
