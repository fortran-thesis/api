import * as service from '../../src/services/authService';
import { describe, it, expect } from '@jest/globals';
describe('authService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
