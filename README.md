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

### 4. Run Locally (local-dev method)

**Note:** Firebase Emulators setup is now deprecated.

- Build and start the development server:

  ```sh
  cd functions
  npm run build:watch
  ```

- In a separate terminal, start the local server:

  ```sh
  npm run dev
  ```

- Once both are running, you can now access endpoints at the API Documentation: [`http://localhost:5001/api-docs`](http://localhost:5001/api-docs)
  
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

### Notes

- Firebase Emulators setup is deprecated. Use local-dev method for development.
- Due to time constraints, Docker setup is NOT fixed. Will fix as soon as there is time.
