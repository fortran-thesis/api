/**
 * Integration Test Helpers
 *
 * Provides utilities for:
 * - Creating test users in Firebase Auth emulator
 * - Getting auth tokens for authenticated requests
 * - Cleaning up emulator data between tests
 * - Building supertest app instance
 */
import supertest from "supertest";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {firebase} from "../../src/configs/firebase";

// Re-export supertest-wrapped app for convenience
import app from "../../src/app";

const API_PREFIX = "/api";

/**
 * Get a supertest agent pointing at the Express app
 */
export function getTestAgent() {
  return supertest(app);
}

/**
 * Get the API base path
 */
export function apiPath(route: string) {
  return `${API_PREFIX}${route}`;
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export interface TestUser {
  uid: string;
  email: string;
  token: string;
}

/**
 * Create a test user in Firebase Auth Emulator and Firestore, returning a valid ID token.
 * This user can be used for authenticated requests.
 */
export async function createTestUser(options: {
  email?: string;
  password?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  address?: string;
}): Promise<TestUser> {
  const auth = getAuth(firebase);
  const db = getFirestore(firebase);

  const email = options.email || `testuser-${Date.now()}@test.com`;
  const password = options.password || "TestPass123!";
  const username = options.username || `testuser_${Date.now()}`;
  const role = options.role || "farmer";

  // Create user in Auth emulator
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: `${options.firstName || "Test"} ${options.lastName || "User"}`,
    emailVerified: true,
  });

  // Create user document in Firestore emulator
  await db.collection("users").doc(userRecord.uid).set({
    username,
    first_name: options.firstName || "Test",
    last_name: options.lastName || "User",
    role,
    address: options.address || "123 Test Street",
    is_banned: false,
    metadata: {
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
    },
  });

  // Get a custom token and exchange it for an ID token via the emulator
  const customToken = await auth.createCustomToken(userRecord.uid);
  const idToken = await exchangeCustomTokenForIdToken(customToken);

  return {
    uid: userRecord.uid,
    email,
    token: idToken,
  };
}

/**
 * Create an admin test user
 */
export async function createAdminUser(
  email?: string
): Promise<TestUser> {
  return createTestUser({
    email: email || `admin-${Date.now()}@test.com`,
    username: `admin_${Date.now()}`,
    role: "admin",
    firstName: "Admin",
    lastName: "User",
  });
}

/**
 * Create a curator/mycologist test user
 */
export async function createCuratorUser(
  email?: string
): Promise<TestUser> {
  return createTestUser({
    email: email || `curator-${Date.now()}@test.com`,
    username: `curator_${Date.now()}`,
    role: "mycologist",
    firstName: "Curator",
    lastName: "User",
  });
}

/**
 * Exchange a custom token for an ID token using the Auth Emulator REST API.
 *
 * The Firebase Auth Emulator exposes a local identity toolkit endpoint
 * that mimics the production signInWithCustomToken flow.
 */
async function exchangeCustomTokenForIdToken(
  customToken: string
): Promise<string> {
  const authEmulatorHost =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

  const url = `http://${authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;

  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to exchange custom token: ${response.status} ${err}`);
  }

  const data = (await response.json()) as {idToken: string};
  return data.idToken;
}

// ─── Firestore Helpers ───────────────────────────────────────────────────────

/**
 * Clean up a specific Firestore collection in the emulator
 */
export async function clearCollection(collectionName: string): Promise<void> {
  const db = getFirestore(firebase);
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Clear all test data from Firestore emulator
 */
export async function clearAllCollections(): Promise<void> {
  const collections = [
    "users",
    "faq",
    "moldipedia",
    "molds",
    "mold_reports",
    "mold_cases",
    "scanned_molds",
    "monitored_molds",
    "reports",
    "flag_reports",
    "system_requests",
    "audit_logs",
    "notifications",
  ];

  for (const col of collections) {
    await clearCollection(col);
  }
}

/**
 * Clear all users from Auth emulator using the REST API
 */
export async function clearAuthUsers(): Promise<void> {
  const authEmulatorHost =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "thesis-dev-project";

  try {
    const response = await fetch(
      `http://${authEmulatorHost}/emulator/v1/projects/${projectId}/accounts`,
      {method: "DELETE"}
    );
    if (!response.ok) {
      console.warn(
        `Failed to clear Auth emulator users: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.warn("Could not clear Auth emulator users:", error);
  }
}

/**
 * Full cleanup: Auth + Firestore emulators
 */
export async function cleanupEmulators(): Promise<void> {
  await Promise.all([clearAllCollections(), clearAuthUsers()]);
}

// ─── Seeding Helpers ─────────────────────────────────────────────────────────

/**
 * Seed a Firestore document directly (useful for setting up test fixtures)
 */
export async function seedDocument<T extends object>(
  collection: string,
  data: T,
  id?: string
): Promise<string> {
  const db = getFirestore(firebase);
  const docWithMeta = {
    ...data,
    metadata: {
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
    },
  };

  if (id) {
    await db.collection(collection).doc(id).set(docWithMeta);
    return id;
  }

  const ref = await db.collection(collection).add(docWithMeta);
  return ref.id;
}

/**
 * Get a Firestore document by ID
 */
export async function getDocument(collection: string, id: string) {
  const db = getFirestore(firebase);
  return db.collection(collection).doc(id).get();
}
