import { sendError, sendSuccess, defaultError } from '../../src/utils/response';
import { describe, it, expect } from '@jest/globals';

describe('response utils', () => {
  it('should export sendError, sendSuccess, defaultError', () => {
    expect(sendError).toBeDefined();
    expect(sendSuccess).toBeDefined();
    expect(defaultError).toBeDefined();
  });
});
