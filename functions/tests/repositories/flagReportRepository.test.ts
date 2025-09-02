import * as repo from '../../src/repositories/flagReportRepository';
import { describe, it, expect } from '@jest/globals';
describe('flagReportRepository (integration)', () => {
  it('should add, find, update, and delete a flag report', async () => {
    const testData = { reason: 'test', user_id: 'user123', report_id: 'report123', created_at: Date.now() };
    const addRes = await repo.addFlagReport(testData as any);
    expect(addRes && addRes.id).toBeDefined();
    const found = await repo.findFlagReportById(addRes!.id);
    expect(found && !found.empty).toBe(true);
    await repo.updateFlagReport(addRes!.id, { reason: 'updated' });
    const updated = await repo.findFlagReportById(addRes!.id);
    expect(updated && !updated.empty).toBe(true);
    expect(updated!.docs[0].data()?.reason).toBe('updated');
    await repo.deleteFlagReport(addRes!.id);
    const deleted = await repo.findFlagReportById(addRes!.id);
    expect(deleted && !deleted.empty).toBe(false);
  });
});
