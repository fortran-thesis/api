import * as repo from '../../src/repositories/auditLogRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('auditLogRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should find audit logs by action and paginate', async () => {
    const logs = await repo.findAuditLogsByAction('CREATE');
    expect(logs).toBeDefined();
    const paginated = await repo.findAllAuditLogs(10, 0);
    expect(paginated).toBeDefined();
  });
});
