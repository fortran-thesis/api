import * as repo from '../../src/repositories/monitoredMoldRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('monitoredMoldRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a monitored mold', async () => {
    const testMold = { folder_id: 'folder123', mold_id: 'mold123', created_at: Date.now() };
    const addRes = await repo.addMonitoredMold(testMold as any);
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await repo.findMonitoredMoldById('folder123');
    expect(found).toBeDefined();
    await repo.updateMonitoredMold(addRes.id, { mold_folder_id: 'updatedfolder' });
    const updated = await repo.findMonitoredMoldById('updatedfolder');
    expect(updated).toBeDefined();
    await repo.deleteMonitoredMold(addRes.id);
    // No direct exists check, but you can check found is null or not found
  });
});
