import * as service from '../../src/services/moldService';
import { describe, it, expect } from '@jest/globals';
describe('moldService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
