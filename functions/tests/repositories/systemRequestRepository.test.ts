import * as repo from '../../src/repositories/systemRequestRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('systemRequestRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a system request', async () => {
    const testRequest = { type: 'test', payload: {}, created_at: Date.now() };
    const addRes = await repo.addSystemRequest(testRequest as any);
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await repo.findSystemRequestById(addRes.id);
    expect(found && !found.empty).toBe(true);
    if (!found || found.empty) return;
    await repo.updateSystemRequest(addRes.id, { message: 'updated' });
    const updated = await repo.findSystemRequestById(addRes.id);
    expect(updated && !updated.empty).toBe(true);
    if (!updated || updated.empty) return;
    expect(updated.docs[0].data()?.message).toBe('updated');
    await repo.deleteSystemRequest(addRes.id);
    const deleted = await repo.findSystemRequestById(addRes.id);
    expect(deleted && !deleted.empty).toBe(false);
  });
});
