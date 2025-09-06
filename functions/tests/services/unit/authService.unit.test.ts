import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getAuth } from 'firebase-admin/auth';
import * as authService from '../../../src/services/authService';
import * as userRepository from '../../../src/repositories/userRepository';
import * as authLib from '../../../src/lib/auth';
import * as firestoreLib from '../../../src/lib/firestore';
import * as emailUtils from '../../../src/utils/email';
import { Role } from '../../../src/types/enums';

// Mock all external dependencies
jest.mock('firebase-admin/auth');
jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/lib/auth');
jest.mock('../../../src/lib/firestore');
jest.mock('../../../src/utils/email');
jest.mock('../../../src/utils/dev');
jest.mock('../../../src/configs/redis', () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockAuthLib = authLib as jest.Mocked<typeof authLib>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;
const mockEmailUtils = emailUtils as jest.Mocked<typeof emailUtils>;

describe('authService (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'password123';

      // Mock Firebase Auth
      const mockCreateUser = jest.fn().mockResolvedValue({ uid: 'test-uid' });
      const mockGetUserByEmail = jest.fn().mockRejectedValue({ code: 'auth/user-not-found' });
      mockGetAuth.mockReturnValue({
        createUser: mockCreateUser,
        getUserByEmail: mockGetUserByEmail,
      } as any);

      // Mock user repository
      mockUserRepository.addUser.mockResolvedValue({ id: 'test-uid' } as any);

      const result = await authService.registerUser(username, email, password);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Successfully created user!');
      expect(mockCreateUser).toHaveBeenCalledWith({
        email,
        emailVerified: false,
        password,
      });
      expect(mockUserRepository.addUser).toHaveBeenCalledWith(
        {
          username,
          role: Role.USER,
          is_banned: false,
          metadata: expect.any(Object),
        },
        'test-uid'
      );
    });

    it('should return error if email already exists', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'password123';

      // Mock existing user
      const mockGetUserByEmail = jest.fn().mockResolvedValue({ uid: 'existing-uid' });
      mockGetAuth.mockReturnValue({
        getUserByEmail: mockGetUserByEmail,
      } as any);

      const result = await authService.registerUser(username, email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already used!');
    });

    it('should handle Firebase Auth creation error', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'password123';

      // Mock Firebase Auth failure
      const mockCreateUser = jest.fn().mockRejectedValue(new Error('Auth error'));
      const mockGetUserByEmail = jest.fn().mockRejectedValue({ code: 'auth/user-not-found' });
      mockGetAuth.mockReturnValue({
        createUser: mockCreateUser,
        getUserByEmail: mockGetUserByEmail,
      } as any);

      const result = await authService.registerUser(username, email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });
  });

  describe('identifyUser', () => {
    it('should successfully identify a user and return token', async () => {
      const username = 'testuser';
      const password = 'password123';
      const mockToken = 'mock-id-token';

      // Mock Firestore lookup
      mockFirestoreLib.getDocumentIdByField.mockResolvedValue('test-uid');

      // Mock auth lib
      mockAuthLib.getAuthUserById.mockResolvedValue({
        uid: 'test-uid',
        details: { email: 'test@example.com' },
      } as any);

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ idToken: mockToken }),
      } as any);

      const result = await authService.identifyUser(username, password);

      expect(result).toBe(mockToken);
      expect(mockFirestoreLib.getDocumentIdByField).toHaveBeenCalledWith('users', 'username', username);
    });

    it('should return null if user not found', async () => {
      const username = 'nonexistent';
      const password = 'password123';

      // Mock Firestore lookup failure
      mockFirestoreLib.getDocumentIdByField.mockResolvedValue(null);

      const result = await authService.identifyUser(username, password);

      expect(result).toBeNull();
    });

    it('should return null if auth fails', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';

      // Mock Firestore lookup
      mockFirestoreLib.getDocumentIdByField.mockResolvedValue('test-uid');

      // Mock auth lib
      mockAuthLib.getAuthUserById.mockResolvedValue({
        uid: 'test-uid',
        details: { email: 'test@example.com' },
      } as any);

      // Mock fetch failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      } as any);

      const result = await authService.identifyUser(username, password);

      expect(result).toBeNull();
    });
  });

  describe('removeUser', () => {
    it('should successfully remove a user', async () => {
      const id = 'test-uid';

      // Mock Firebase Auth delete
      const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        deleteUser: mockDeleteUser,
      } as any);

      // Mock Firestore delete
      mockUserRepository.deleteFirestoreUser.mockResolvedValue({} as any);

      await authService.removeUser(id);

      expect(mockDeleteUser).toHaveBeenCalledWith(id);
      expect(mockUserRepository.deleteFirestoreUser).toHaveBeenCalledWith(id);
    });

    it('should handle user deletion error gracefully', async () => {
      const id = 'test-uid';

      // Mock Firebase Auth delete failure
      const mockDeleteUser = jest.fn().mockRejectedValue(new Error('Delete failed'));
      mockGetAuth.mockReturnValue({
        deleteUser: mockDeleteUser,
      } as any);

      // Should not throw - errors are logged
      await expect(authService.removeUser(id)).resolves.not.toThrow();
    });
  });
});