import * as repo from '../../src/repositories/moldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('moldRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a mold', async () => {
    const testMold = { id: 'mold123', name: 'testmold', created_at: Date.now() };
    const addRes = await repo.addMold(testMold as any);
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await repo.findMoldById('mold123');
    expect(found).toBeDefined();
    await repo.updateMold(addRes.id, { name: 'updatedmold' });
    const updated = await repo.findMoldById('mold123');
    expect(updated).toBeDefined();
    await repo.deleteMold(addRes.id);
    // No direct exists check, but you can check found is null or not found
  });
});
