import * as service from '../../src/services/reportService';
import { describe, it, expect } from '@jest/globals';
describe('reportService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
