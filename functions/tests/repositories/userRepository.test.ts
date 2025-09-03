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

  it('should soft delete the test user', async () => {
    await userRepo.softDeleteFirestoreUser('testuid');
    const check = await userRepo.findFirestoreUserById('testuid');
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it('should delete the test user', async () => {
    await userRepo.deleteFirestoreUser('testuid');
    expect(await userRepo.findFirestoreUserById('testuid')).toBe(null)
  });

  describe('paginate users', () => {
    it('should successfully paginate', async () => {
      // seed extra users
      const extraUsers = Array.from({ length: 7 }, (_, i) => ({ username: `paginated_user_${i}`, role: 'USER', is_banned: false }));
      for (let i = 0; i < extraUsers.length; i++) {
        await userRepo.addUser(extraUsers[i] as any, `puid_${i}`);
      }

      const first = await userRepo.findAllUsers(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();

      const second = await userRepo.findAllUsers(3, first!.nextPageToken || undefined);
      expect(second && second.snapshot.size).toBe(3);

      const third = await userRepo.findAllUsers(3, second!.nextPageToken || undefined);
      // Remaining could be 1 (7 total) or more if other tests added users
      expect(third && third.snapshot.size >= 1).toBe(true);
    })
  });
});
