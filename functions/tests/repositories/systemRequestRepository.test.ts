import * as repo from '../../src/repositories/systemRequestRepository';
import { describe, it, expect } from '@jest/globals';

describe('systemRequestRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test system request', async () => {
    const testRequest = { type: 'test', payload: {}, created_at: Date.now() };
    const addRes = await repo.addSystemRequest(testRequest as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test system request', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findSystemRequestById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test system request', async () => {
    await repo.updateSystemRequest(globalId!, { message: 'updated' });
    const updated = await repo.findSystemRequestById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.message).toBe('updated');
  });

  it('should soft delete the test system request', async () => {
    await repo.softDeleteSystemRequest(globalId!);
    const check = await repo.findSystemRequestById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it('should delete the test system request', async () => {
    await repo.deleteSystemRequest(globalId!);
    expect(await repo.findSystemRequestById(globalId!)).toBe(null);
  });

  describe('paginate system requests', () => {
    it('should successfully paginate', async () => {
      // seed extra requests
      const extraRequests = Array.from({ length: 7 }, (_, i) => ({ userId: `user_${i}`, type: `paginated_type_${i}`, payload: {}, created_at: Date.now() }));
      for (let i = 0; i < extraRequests.length; i++) {
        await repo.addSystemRequest(extraRequests[i] as any);
      }
      const first = await repo.findAllSystemRequests(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllSystemRequests(3, first!.nextPageToken || undefined);
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllSystemRequests(3, second!.nextPageToken || undefined);
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
