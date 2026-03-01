/**
 * Global Teardown for Integration Tests
 *
 * When using `firebase emulators:exec`, emulators are cleaned up automatically.
 * This file exists for the Jest config contract — no manual cleanup needed.
 */
export default async function globalTeardown() {
  console.log("\n✅ Integration tests complete.\n");
}
