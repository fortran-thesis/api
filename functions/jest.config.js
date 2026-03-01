module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts'],  // Exclude integration tests — they require emulators and have their own config
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],  silent: true,
};