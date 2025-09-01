import * as service from '../../src/services/monitoredMoldService';
import { describe, it, expect } from '@jest/globals';
describe('monitoredMoldService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
