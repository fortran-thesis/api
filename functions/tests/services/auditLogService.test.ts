import * as service from '../../src/services/auditLogService';
import { describe, it, expect } from '@jest/globals';
describe('auditLogService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
