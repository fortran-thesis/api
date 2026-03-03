# Thesis API Functions

## Docker Setup (Recommended)

The easiest way to start the entire backend stack (API, Firebase emulators, Redis, MailHog) is using Docker.

### 1. Prerequisite

Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

---

### 2. Start Services

From the `api` directory, run:

```bash
docker compose up --build
```

This will:
- Build the API application container
- Start the Firebase Emulator suite (Auth, Firestore, Storage)
- Automatically seed test users and data
- Start Redis and MailHog

### 3. Service Access

| Service | Host | Port |
|---|---|---|
| API | `localhost` | `5001` |
| Firestore Emulator | `localhost` | `8080` |
| Auth Emulator | `localhost` | `9099` |
| Storage Emulator | `localhost` | `9199` |
| Emulator UI | `localhost` | `4000` |
| MailHog UI | `localhost` | `8025` |
| Redis | `localhost` | `6379` |

### 4. Test User Credentials

The seed service automatically creates 3 test accounts after startup:

**Admin User**
- Email: `admin@test.local`
- Password: `Test[]1234`
- Username: `Admin`
- Role: `admin`

**Mycologist (Curator) User**
- Email: `mycologist@test.local`
- Password: `Test[]1234`
- Username: `Myco`
- Role: `mycologist`

**Farmer User**
- Email: `farmer@test.local`
- Password: `Test[]1234`
- Username: `Farmer`
- Role: `farmer`

### 5. Running Seed Manually

To reseed the database after clearing data:

```bash
docker compose run --rm seed npm run seed
```

The seed script is idempotent — existing users are detected and skipped, and Firestore documents are created or updated.

### 6. View Logs

Watch the seed service run:

```bash
docker compose logs -f seed
```

---

## Local Development Setup (Without Docker)

If you prefer to run locally without Docker:

### 1. Prerequisites

- Node.js 22 or higher
- npm or yarn
- Firebase CLI (for emulators)

### 2. Install Dependencies

```sh
cd api/functions
npm install
```

### 3. Environment Configuration

Copy `.env.dev` to `.env` for local development:

```sh
cp .env.dev .env
```

**Note:** Do NOT edit the `.env.dev` file directly. Create a local `.env` from it instead.

### 4. Run Locally

Start the development server with hot module reload:

```sh
npm run local-dev
```

**Note:** This requires Firebase Emulators to be running separately. You can either:
- Run emulators locally: `firebase emulators:start`
- Or use Docker Compose for emulators only: `docker compose up firebase-emulator redis mailhog`

Once running, access the API docs at: [`http://localhost:5001/api-docs`](http://localhost:5001/api-docs)

---

### 5. Running Tests

- To run all tests:

  ```sh
  npm test
  ```

- To run tests with coverage:

  ```sh
  npm run test:coverage
  ```

- To run specific test files:

  ```sh
  npm test -- path/to/test/file.test.ts
  ```

---

## Troubleshooting

### Firebase Emulator Won't Start
- Java 21+ is required. The Docker image (`eclipse-temurin:21-jre`) handles this automatically.
- Check port conflicts:
  ```bash
  netstat -ano | findstr :8080
  ```
- View logs: `docker compose logs firebase-emulator`

### Seed Service Fails
- Check seed logs: `docker compose logs seed`
- Verify emulators are running: `docker compose logs firebase-emulator`
- Manually trigger seed: `docker compose run --rm seed npm run seed`

### API HMR Not Working
- Verify volume mount: `docker compose logs app | grep -i volume`
- Look for container restarts: `docker compose logs app`
- Restart container: `docker compose restart app`

### MailHog Not Receiving Emails
- Check MailHog UI at `http://localhost:8025`
- Verify `.env.dev` has `USE_MAILHOG=true`
- Check API logs for email errors: `docker compose logs app | grep email`
