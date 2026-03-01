# Integration Tests

Integration tests run against **Firebase Emulators** (Auth, Firestore, Storage) to validate API behavior end-to-end without hitting production services.

## Prerequisites

- **Java 11+** (required by Firebase Emulators)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Node.js 22+**

## Running Integration Tests

### Recommended: Auto-start emulators (one command)

```bash
npm run test:integration:emulator
```

This uses `firebase emulators:exec` to:
1. Start Auth, Firestore, and Storage emulators
2. Run all integration tests
3. Shut down emulators when complete

### Manual: Start emulators separately

```bash
# Terminal 1 — Start emulators
cd api
firebase emulators:start --only auth,firestore,storage --project thesis-dev-project

# Terminal 2 — Run tests
cd api/functions
npm run test:integration
```

### Before-push (includes integration tests)

```bash
npm run before-push
```

This runs: type-check → lint → unit tests → integration tests (with emulators).

## Test Structure

```
tests/integration/
├── globalSetup.ts          # Verifies emulators are running
├── globalTeardown.ts       # Cleanup
├── setup.ts                # Sets emulator env vars
├── helpers.ts              # Test utilities (auth, seeding, cleanup)
├── auth.integration.test.ts
├── user.integration.test.ts
├── faq.integration.test.ts
├── moldipedia.integration.test.ts
├── mold.integration.test.ts
├── moldReport.integration.test.ts
├── admin.integration.test.ts
├── auditLog.integration.test.ts
├── report.integration.test.ts
├── flagReport.integration.test.ts
├── systemRequest.integration.test.ts
└── middleware.integration.test.ts
```

## Modules Covered

| Module | Endpoints Tested |
|---|---|
| **Auth** | register, login, logout |
| **User** | list, profile, get by ID, update profile, mycologists, role counts |
| **FAQ** | CRUD (create, read, update, soft/hard delete) |
| **Moldipedia** | CRUD, archive/unarchive |
| **Mold** | list, get by ID |
| **Mold Report** | list, get by ID, public resolved count |
| **Admin** | disable/enable/ban user |
| **Audit Log** | list all, filter by action |
| **Report** | list, get by ID |
| **Flag Report** | list, get by ID |
| **System Request** | list, get by ID |
| **Middleware** | Auth verification, CORS, 404 handling |

## Test Helpers

The `helpers.ts` file provides:

- **`createTestUser()`** — Creates a user in Auth emulator + Firestore with a valid ID token
- **`createAdminUser()`** — Shortcut for admin role users
- **`createCuratorUser()`** — Shortcut for mycologist/curator role users
- **`cleanupEmulators()`** — Clears all Auth users and Firestore collections
- **`seedDocument()`** — Directly seeds Firestore documents for test fixtures
- **`getTestAgent()`** — Returns a supertest agent for the Express app
- **`apiPath()`** — Prefixes routes with `/api`

## Environment

Integration tests use `.env.test` which points to local emulators:

```
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
NODE_ENV=test
```
