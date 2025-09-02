import * as repo from '../../src/repositories/monitoredMoldRepository';
import { describe, it, expect } from '@jest/globals';

describe('monitoredMoldRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test monitored mold', async () => {
    const testMold = { folder_id: 'folder123', mold_id: 'mold123', created_at: Date.now() };
    const addRes = await repo.addMonitoredMold(testMold as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test monitored mold', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findMonitoredMoldById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test monitored mold', async () => {
    await repo.updateMonitoredMold(globalId!, { mold_folder_id: 'updatedfolder' });
    const updated = await repo.findMonitoredMoldById(globalId!);
    expect(updated && updated.exists).toBe(true);
    // You can add more assertions here if needed
  });

  it('should delete the test monitored mold', async () => {
    await repo.deleteMonitoredMold(globalId!);
    expect(await repo.findMonitoredMoldById(globalId!)).toBe(null);
  });
});
