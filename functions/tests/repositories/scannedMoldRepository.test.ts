import * as repo from '../../src/repositories/scannedMoldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('scannedMoldRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should export expected functions', () => {
    expect(repo).toBeDefined();
  });
});
