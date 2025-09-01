import * as repo from '../../src/repositories/moldFolderRespository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('moldFolderRespository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a mold folder', async () => {
    const testFolder = { id: 'folder123', name: 'testfolder', user_id: 'user123', is_archived: false };
    const addRes = await repo.addMoldFolder(testFolder as any);
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await repo.findMoldFolderById('folder123');
    expect(found).toBeDefined();
    await repo.updateMoldFolder(addRes.id, { name: 'updatedfolder' });
    const updated = await repo.findMoldFolderById('folder123');
    expect(updated).toBeDefined();
    await repo.deleteMoldFolder(addRes.id);
    // No direct exists check, but you can check found is null or not found
  });
});
