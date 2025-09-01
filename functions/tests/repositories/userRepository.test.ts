import * as userRepo from '../../src/repositories/userRepository';
import { describe, it, expect } from '@jest/globals';

const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;

describe('userRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it('should add, find, update, and delete a user', async () => {
    const testUser = { username: 'testuser', role: 'USER', is_banned: false };
    const addRes = await userRepo.addUser(testUser as any, 'testuid');
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await userRepo.findFirestoreUserById('testuid');
    expect(found && !found.empty).toBe(true);
    if (!found || found.empty) return;
    await userRepo.updateFirestoreUser('testuid', { username: 'updateduser' });
    const updated = await userRepo.findFirestoreUserById('testuid');
    expect(updated && !updated.empty).toBe(true);
    if (!updated || updated.empty) return;
    expect(updated.docs[0].data()?.username).toBe('updateduser');
    await userRepo.deleteFirestoreUser('testuid');
    const deleted = await userRepo.findFirestoreUserById('testuid');
    expect(deleted && !deleted.empty).toBe(false);
  });
});
