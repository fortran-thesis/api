# Thesis API Functions

## Setup Instructions

### 1. Clone the Repository

```sh
git clone https://github.com/fortran-thesis/api.git
cd api/functions
```

---

### 2. Environment Configuration

- Copy `.env.dev` to `.env` for local development:

 ```sh
 cp .env.dev .env
 ```

- Copy `.env.test` to `.env` for testing:

 ```sh
 cp .env.test .env
 ```

- Notes: do **NOT** edit the `.env.dev` or the `.env.test` files.

---

### 3. Install Dependencies (Local)

```sh
npm install
```

---

### 4. Run Locally (with Firebase Emulators)

- Start Firebase emulators at the root directory:

  ```sh
  cd *your-directory-to*/api
  firebase emulators:start
  ```

- In a separate terminal, run the app at the functions folder:

  ```sh
  cd functions
  npm run build:watch
  ```

- Once both are running, you can now access endpoints at the (API Documentation)[`http://localhost:5001/thesis-2e701/asia-southeast1/api/api-docs`]
  
---

### 5. Run with Docker (NOT WORKING AS OF NOW)

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

 ``` sh
 sh npm test
 ```

- To run tests with coverage:

 ```sh
 npm test:coverage
 ```

---

### Notes

- For `.env`, copy and paste `.env.dev` for development or `.env.test` for testing.
- For Docker, environment variables from `.env.dev` are loaded automatically if specified in `docker-compose.yml`.
