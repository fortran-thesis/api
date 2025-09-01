import * as repo from '../../src/repositories/reportRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('reportRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a report', async () => {
    const testReport = { title: 'test', description: 'desc', created_at: Date.now() };
    const addRes = await repo.addReport(testReport as any);
    expect(addRes && addRes.id).toBeDefined();
    if (!addRes) return;
    const found = await repo.findReportById(addRes.id);
    expect(found && !found.empty).toBe(true);
    if (!found || found.empty) return;
    await repo.updateReport(addRes.id, { details: 'updated' });
    const updated = await repo.findReportById(addRes.id);
    expect(updated && !updated.empty).toBe(true);
    if (!updated || updated.empty) return;
    expect(updated.docs[0].data()?.details).toBe('updated');
    await repo.deleteReport(addRes.id);
    const deleted = await repo.findReportById(addRes.id);
    expect(deleted && !deleted.empty).toBe(false);
  });
});
