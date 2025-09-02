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

  it('should delete the test scanned mold', async () => {
    await repo.deleteScannedMold(globalId!);
    const deleted = await repo.findScannedMoldById(globalId!);
    expect(deleted && deleted.exists).toBe(null);
  });
});
