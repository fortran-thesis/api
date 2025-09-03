import * as repo from '../../src/repositories/scannedMoldRepository';
import { describe, it, expect } from '@jest/globals';

describe('scannedMoldRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test scanned mold', async () => {
    const testMold = { scan_id: 'scan123', created_at: Date.now() };
    const addRes = await repo.addScannedMold(testMold as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test scanned mold', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findScannedMoldById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test scanned mold', async () => {
    await repo.updateScannedMold(globalId!, { scanned_results: { confidence_score: 100, flagged: false }});
    const updated = await repo.findScannedMoldById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.scanned_results).toEqual({ confidence_score: 100, flagged: false });
  });

  it('should soft delete the test scanned mold', async () => {
    await repo.softDeleteScannedMold(globalId!);
    const check = await repo.findScannedMoldById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it('should delete the test scanned mold', async () => {
    await repo.deleteScannedMold(globalId!);
    expect(await repo.findScannedMoldById(globalId!)).toBe(null);
  });

  describe('paginate scanned molds', () => {
    it('should successfully paginate', async () => {
      // seed extra scanned molds
      const extraMolds = Array.from({ length: 7 }, (_, i) => ({ user_id: `user_${i}`, scan_id: `paginated_scan_${i}`, created_at: Date.now() }));
      for (let i = 0; i < extraMolds.length; i++) {
        await repo.addScannedMold(extraMolds[i] as any);
      }
      const first = await repo.findAllScannedMolds(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllScannedMolds(3, first!.nextPageToken || undefined);
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllScannedMolds(3, second!.nextPageToken || undefined);
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
