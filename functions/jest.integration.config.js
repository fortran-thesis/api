module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.ts',
  setupFiles: ['<rootDir>/tests/integration/setup.ts'],
  testTimeout: 30000,
  // Suppress noisy console output (Redis retries, swagger warnings, etc.)
  // while still showing the verbose test-name tree and failure summaries.
  silent: true,
  verbose: true,
  // Run tests sequentially — emulator tests shouldn't race
  maxWorkers: 1,
};
