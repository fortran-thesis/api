import * as userService from '../../src/services/userService';
import { describe, it, expect, jest } from '@jest/globals';

describe('userService (unit)', () => {
  it('should export expected service functions', () => {
    expect(userService.retrieveAllUsers).toBeDefined();
    expect(userService.retrieveUserById).toBeDefined();
    expect(userService.retrieveUserByEmail).toBeDefined();
  });
});
