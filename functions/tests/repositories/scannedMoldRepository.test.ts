import * as repo from '../../src/repositories/scannedMoldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('scannedMoldRepository (integration)', () => {
  it('should add, find, update, and delete a scanned mold', async () => {
    const testMold = { mold_id: 'mold123', scan_id: 'scan123', created_at: Date.now() };
    const addRes = await repo.addScannedMold(testMold as any);
    expect(addRes && addRes.id).toBeDefined();
    const found = await repo.findScannedMoldById(addRes!.id);
    expect(found && !found.empty && found.docs.length > 0).toBe(true);
    await repo.updateScannedMold(addRes!.id, { scanned_results: { confidence_score: 100, flagged: false }});
    const updated = await repo.findScannedMoldById(addRes!.id);
    expect(updated && !updated.empty && updated.docs.length > 0).toBe(true);
    expect(updated!.docs[0].data()?.scanned_results).toBe({ confidence_score: 100, flagged: false });
    await repo.deleteScannedMold(addRes!.id);
    const deleted = await repo.findScannedMoldById(addRes!.id);
    expect(deleted && (deleted.empty || deleted.docs.length === 0)).toBe(true);
  });
});
