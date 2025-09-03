/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import dotenv from "dotenv";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import app from "./app";

dotenv.config();
logger.info("Loaded NODE_ENV:", process.env.NODE_ENV);

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const api = onRequest(
  {
    region: "asia-southeast1",
  },
  app
);
