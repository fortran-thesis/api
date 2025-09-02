import * as userRepo from '../../src/repositories/userRepository';
import { describe, it, expect } from '@jest/globals';

describe('userRepository (integration)', () => {
  it('should add the test user', async () => {
    const testUser = { username: 'testuser', role: 'USER', is_banned: false };
    const addRes = await userRepo.addUser(testUser as any, 'testuid');
    expect(addRes && addRes.id).toBeDefined();
    expect(addRes!.id).toBe('testuid')
  });

  it('should find the test user', async () => {
    const found = await userRepo.findFirestoreUserById('testuid');
    expect(found && found.exists).toBe(true);
  });

  it('should update the test user', async () => {
    await userRepo.updateFirestoreUser('testuid', { username: 'updateduser' });
    const updated = await userRepo.findFirestoreUserById('testuid');
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.username).toBe('updateduser');
  });

  it('should delete the test user', async () => {
    await userRepo.deleteFirestoreUser('testuid');
    expect(await userRepo.findFirestoreUserById('testuid')).toBe(null)
  })
});
