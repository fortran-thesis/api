# Thesis API Functions

## Setup Instructions

### 1. Clone the Repository
```sh
git clone https://github.com/your-username/thesis.git
cd thesis/api/functions
```

---

### 2. Environment Configuration

- Copy `.env.dev` to `.env` for local development:
	```sh
	cp .env.dev .env
	```
- Edit `.env` as needed for your local setup.

---

### 3. Install Dependencies (Local)
```sh
npm install
```

---

### 4. Run Locally (with Firebase Emulators)
1. Start Firebase emulators (Firestore, Auth, Storage):
	 ```sh
	 firebase emulators:start
	 ```
2. In a separate terminal, run the app:
	 ```sh
	 npm run dev
	 ```
3. Access endpoints at:
	 ```
	 http://localhost:5001/<project-id>/<region>/<function-name>/
	 ```

---

### 5. Run with Docker

#### Build and Start Containers
```sh
cd ../../  # Go to the api folder where docker-compose.yml is located
docker-compose up --build
```

#### Stop Containers
```sh
docker-compose down
```

---

### 6. Running Tests

- To run all tests:
	```sh
	npm test
	```
- To run tests with coverage:
	```sh
	npm run test:coverage
	```

---

### Notes

- Use `.env.dev` for development and testing. Copy or rename it to `.env` as needed.
- For Docker, environment variables from `.env.dev` are loaded automatically if specified in `docker-compose.yml`.
- Endpoints and Swagger UI are available at the Firebase emulator URLs (see emulator logs for exact paths).

---
