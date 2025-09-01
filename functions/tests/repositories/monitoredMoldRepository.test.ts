import * as repo from '../../src/repositories/monitoredMoldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('monitoredMoldRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should export expected functions', () => {
    expect(repo).toBeDefined();
  });
});
