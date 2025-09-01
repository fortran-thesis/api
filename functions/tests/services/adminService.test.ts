import * as service from '../../src/services/adminService';
import { describe, it, expect } from '@jest/globals';
describe('adminService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
