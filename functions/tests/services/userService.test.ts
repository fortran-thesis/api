import * as userService from '../../src/services/userService';
import { describe, it, expect, jest } from '@jest/globals';

describe('userService (unit)', () => {
  it('should export expected service functions', () => {
    expect(userService.retrieveAllUsers).toBeDefined();
    expect(userService.retrieveUserById).toBeDefined();
    expect(userService.retrieveUserByEmail).toBeDefined();
  });

  it('should return null if repository throws in retrieveAllUsers', async () => {
    jest.spyOn(userService, 'retrieveAllUsers').mockResolvedValueOnce(null);
    const result = await userService.retrieveAllUsers(10, 0);
    expect(result).toBeNull();
  });

  it('should return null if repository throws in retrieveUserById', async () => {
    jest.spyOn(userService, 'retrieveUserById').mockResolvedValueOnce(null);
    const result = await userService.retrieveUserById('badid');
    expect(result).toBeNull();
  });

  it('should return null if repository throws in retrieveUserByEmail', async () => {
    jest.spyOn(userService, 'retrieveUserByEmail').mockResolvedValueOnce(null);
    const result = await userService.retrieveUserByEmail('bademail');
    expect(result).toBeNull();
  });
});
