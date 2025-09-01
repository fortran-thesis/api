import * as service from '../../src/services/moldipediaService';
import { describe, it, expect } from '@jest/globals';
describe('moldipediaService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
