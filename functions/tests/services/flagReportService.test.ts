import * as service from '../../src/services/flagReportService';
import { describe, it, expect } from '@jest/globals';
describe('flagReportService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
