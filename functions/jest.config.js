module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['/node_modules/'],
  silent: true,
};