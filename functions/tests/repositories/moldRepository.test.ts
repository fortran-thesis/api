import * as repo from '../../src/repositories/moldRepository';
import { describe, it, expect } from '@jest/globals';

describe('moldRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test mold', async () => {
    const testMold = {name: 'testmold', created_at: Date.now() };
    const addRes = await repo.addMold(testMold as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
    expect(addRes!.id).toBe(globalId!);
  });

  it('should find the test mold', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findMoldById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test mold', async () => {
    await repo.updateMold(globalId!, { name: 'updatedmold' });
    const updated = await repo.findMoldById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated?.data()?.name).toBe('updatedmold');
  });

  it('should delete the test mold', async () => {
    await repo.deleteMold(globalId!);
    expect(await repo.findMoldById(globalId!)).toBe(null);
  });
});
