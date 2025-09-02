import * as repo from '../../src/repositories/moldFolderRespository';
import { describe, it, expect } from '@jest/globals';

describe('moldFolderRespository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test mold folder', async () => {
    const testFolder = { id: 'folder123', name: 'testfolder', user_id: 'user123', is_archived: false };
    const addRes = await repo.addMoldFolder(testFolder as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test mold folder', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findMoldFolderById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test mold folder', async () => {
    await repo.updateMoldFolder(globalId!, { name: 'updatedfolder' });
    const updated = await repo.findMoldFolderById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated?.data()?.name).toBe('updatedfolder');
  });

  it('should delete the test mold folder', async () => {
    await repo.deleteMoldFolder(globalId!);
    expect(await repo.findMoldFolderById(globalId!)).toBe(null);
  });
});
