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

  it('should delete the test system request', async () => {
    await repo.deleteSystemRequest(globalId!);
    const deleted = await repo.findSystemRequestById(globalId!);
    expect(deleted && deleted.exists).toBe(null);
  });
});
