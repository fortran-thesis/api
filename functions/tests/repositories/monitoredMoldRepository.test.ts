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

  describe('paginate monitored molds', () => {
    it('should successfully paginate', async () => {
      // seed extra monitored molds
      const extraMolds = Array.from({ length: 7 }, (_, i) => ({ mold_id: `paginated_mold_${i}`, created_at: Date.now() }));
      for (let i = 0; i < extraMolds.length; i++) {
        await repo.addMonitoredMold(extraMolds[i] as any);
      }
      const first = await repo.findAllMonitoredMolds(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllMonitoredMolds(3, first!.nextPageToken || undefined);
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllMonitoredMolds(3, second!.nextPageToken || undefined);
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
