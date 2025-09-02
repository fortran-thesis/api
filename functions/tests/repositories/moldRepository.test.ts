import * as repo from '../../src/repositories/moldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('moldRepository (integration)', () => {
  it('should add, find, update, and delete a mold', async () => {
    const testMold = { id: 'mold123', name: 'testmold', created_at: Date.now() };
    const addRes = await repo.addMold(testMold as any);
    expect(addRes && addRes.id).toBeDefined();
    expect(addRes!.id).toBe('mold123')
    const found = await repo.findMoldById('mold123');
    expect(found).toBeDefined();
    await repo.updateMold(addRes!.id, { name: 'updatedmold' });
    const updated = await repo.findMoldById('mold123');
    expect(updated).toBeDefined();
    expect(updated?.docs[0].data()?.name).toBe('updatedmold');
    await repo.deleteMold(addRes!.id);
  });
});
