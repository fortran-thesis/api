import * as authLib from '../../src/lib/auth';
import { describe, it, expect } from '@jest/globals';

const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST;

describe('auth lib (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firebase emulator', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it('should export verifyToken, verifyCookie, getAuthUserById, getAuthUserByEmail, generateCookie', () => {
    expect(authLib.verifyToken).toBeDefined();
    expect(authLib.verifyCookie).toBeDefined();
    expect(authLib.getAuthUserById).toBeDefined();
    expect(authLib.getAuthUserByEmail).toBeDefined();
    expect(authLib.generateCookie).toBeDefined();
  });

  // Add more integration tests with Firebase mocking or emulator
});
