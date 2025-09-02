import * as repo from '../../src/repositories/moldipediaRepository';
import { describe, it, expect } from '@jest/globals';

describe('moldipediaRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test moldipedia entry', async () => {
    const testEntry = { name: 'testentry', description: 'desc', created_at: Date.now() };
    const addRes = await repo.addMoldipedia(testEntry as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test moldipedia entry', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findMoldipediaById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test moldipedia entry', async () => {
    await repo.updateMoldipedia(globalId!, { body: 'updateddesc' });
    const updated = await repo.findMoldipediaById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated?.data()?.body).toBe('updateddesc');
  });

  it('should delete the test moldipedia entry', async () => {
    await repo.deleteMoldipedia(globalId!);
    expect(await repo.findMoldipediaById(globalId!)).toBe(null);
  });
});
