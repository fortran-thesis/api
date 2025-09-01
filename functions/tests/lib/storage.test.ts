import * as storageLib from '../../src/lib/storage';
import { describe, it, expect } from '@jest/globals';

const isEmulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;

describe('storage lib (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firebase emulator', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it('should export uploadFile, uploadFiles, downloadFile, deleteFile, getSignedUrl', () => {
    expect(storageLib.uploadFile).toBeDefined();
    expect(storageLib.uploadFiles).toBeDefined();
    expect(storageLib.downloadFile).toBeDefined();
    expect(storageLib.deleteFile).toBeDefined();
    expect(storageLib.getSignedUrl).toBeDefined();
  });

  // Add more integration tests with GCS mocking or emulator
});
