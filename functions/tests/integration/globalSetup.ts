/**
 * Global Setup for Integration Tests
 *
 * When running via `firebase emulators:exec`, emulators are already available.
 * When running standalone (`npm run test:integration`), this verifies
 * that emulators are reachable and waits if needed.
 */
import * as http from "http";

/**
 * Check if a port is already in use (emulator already running)
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, () => {
      resolve(true);
    });
    req.on("error", () => {
      resolve(false);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for emulators to become available
 */
async function waitForEmulators(timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  const ports = [
    {name: "Firestore", port: 8080},
    {name: "Auth", port: 9099},
    {name: "Storage", port: 9199},
  ];

  for (const {name, port} of ports) {
    while (Date.now() - start < timeoutMs) {
      const inUse = await isPortInUse(port);
      if (inUse) {
        console.log(`  ✓ ${name} emulator ready on port ${port}`);
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (Date.now() - start >= timeoutMs) {
      throw new Error(
        `Timeout waiting for ${name} emulator on port ${port}.\n` +
        "Make sure emulators are running:\n" +
        "  npm run test:integration:emulator  (auto-starts emulators)\n" +
        "  OR start emulators separately: firebase emulators:start --only auth,firestore,storage --project thesis-dev-project"
      );
    }
  }
}

export default async function globalSetup() {
  console.log("\n🔥 Checking Firebase Emulators for integration tests...\n");

  // Set environment variables for emulators
  // Use 127.0.0.1 to avoid Node.js IPv6 (::1) resolution issues
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
  process.env.NODE_ENV = "test";
  process.env.IS_TESTING = "true";
  process.env.GOOGLE_CLOUD_PROJECT = "thesis-dev-project";
  process.env.GCLOUD_PROJECT = "thesis-dev-project";

  await waitForEmulators(60000);
  console.log("\n  🚀 All emulators ready — starting tests.\n");
}
