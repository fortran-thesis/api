import * as service from '../../src/services/scannedMoldService';
import { describe, it, expect } from '@jest/globals';
describe('scannedMoldService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
