import * as repo from '../../src/repositories/reportRepository';
import { describe, it, expect } from '@jest/globals';

describe('reportRepository (integration)', () => {
  let globalId: string | null = null;

  it('should add the test report', async () => {
    const testReport = { title: 'test', description: 'desc', created_at: Date.now() };
    const addRes = await repo.addReport(testReport as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it('should find the test report', async () => {
    if (globalId === null) throw new Error('globalId is null');
    const found = await repo.findReportById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it('should update the test report', async () => {
    await repo.updateReport(globalId!, { details: 'updated' });
    const updated = await repo.findReportById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.details).toBe('updated');
  });

  it('should delete the test report', async () => {
    await repo.deleteReport(globalId!);
    expect(await repo.findReportById(globalId!)).toBe(null);
  });
});
