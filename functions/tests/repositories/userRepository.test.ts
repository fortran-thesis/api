import * as userRepo from '../../src/repositories/userRepository';
import { describe, it, expect } from '@jest/globals';
import { User, WithMetadata } from '../../src/types/types';
import { Role } from '../../src/types/enums';

const testUser: User = { username: 'testuser', role: Role.USER, is_banned: false };

describe('userRepository (integration)', () => {
  it('should add the test user', async () => {
    const addRes = await userRepo.addUser(testUser, 'testuid');
    expect(addRes && addRes.id).toBe('testuid')
  });

  it('should not allow duplicate user creation and returns null', async () => {
    await userRepo.addUser(testUser, 'dupeuid')
    await expect(userRepo.addUser(testUser, 'dupeuid')).resolves.toBeNull()
    await userRepo.deleteFirestoreUser('dupeuid');
  });

  it('should find the test user', async () => {
    const found = await userRepo.findFirestoreUserById('testuid');
    expect(found && found.exists).toBeTruthy();
    expect(found && found.data()?.username).toBe(testUser.username);
    expect(found && found.data()?.is_banned).toBe(testUser.is_banned);
    expect(found && found.data()?.role).toBe(testUser.role);
  });

  it('should not find a non-existent user', async () => {
    const result = await userRepo.findFirestoreUserById('does_not_exist');
    expect(result).toBeNull();
  });

  it('should update the test user', async () => {
    await userRepo.updateFirestoreUser('testuid', { username: 'updateduser' });
    const updated = await userRepo.findFirestoreUserById('testuid');
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.username).toBe('updateduser');
  });

  it('should return null when trying to update a non-existent user', async () => {
    const updated = await userRepo.updateFirestoreUser('does_not_exist', { username: 'foo' });
    expect(updated).toBeNull();
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

  it('should not delete a non-existing user', async () => {
    await expect(userRepo.deleteFirestoreUser('does_not_exist')).resolves.toBeNull();
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
