import * as repo from '../../src/repositories/moldFolderRespository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('moldFolderRespository (integration)', () => {
  it('should add, find, update, and delete a mold folder', async () => {
    const testFolder = { id: 'folder123', name: 'testfolder', user_id: 'user123', is_archived: false };
    const addRes = await repo.addMoldFolder(testFolder as any);
    expect(addRes && addRes.id).toBeDefined();
    const found = await repo.findMoldFolderById('folder123');
    expect(found).toBeDefined();
    await repo.updateMoldFolder(addRes!.id, { name: 'updatedfolder' });
    const updated = await repo.findMoldFolderById('folder123');
    expect(updated).toBeDefined();
    expect(updated?.docs[0].data()?.name).toBe('updatedfolder');
    await repo.deleteMoldFolder(addRes!.id);
  });
});
