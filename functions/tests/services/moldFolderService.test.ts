import * as service from '../../src/services/moldFolderService';
import { describe, it, expect } from '@jest/globals';
describe('moldFolderService (unit)', () => {
  it('should export expected service functions', () => {
    expect(service).toBeDefined();
  });
});
