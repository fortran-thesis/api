import * as repo from '../../src/repositories/systemRequestRepository';
import { describe, it, expect } from '@jest/globals';
describe('systemRequestRepository (integration)', () => {
  it('should add, find, update, and delete a system request', async () => {
    const testRequest = { type: 'test', payload: {}, created_at: Date.now() };
    const addRes = await repo.addSystemRequest(testRequest as any);
    expect(addRes && addRes.id).toBeDefined();
    const found = await repo.findSystemRequestById(addRes!.id);
    expect(found && !found.empty).toBe(true);
    await repo.updateSystemRequest(addRes!.id, { message: 'updated' });
    const updated = await repo.findSystemRequestById(addRes!.id);
    expect(updated && !updated.empty).toBe(true);
    expect(updated!.docs[0].data()?.message).toBe('updated');
    await repo.deleteSystemRequest(addRes!.id);
    const deleted = await repo.findSystemRequestById(addRes!.id);
    expect(deleted && !deleted.empty).toBe(false);
  });
});
