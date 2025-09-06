import { verifyUser } from '../../src/middlewares/verification';
import { describe, it, expect, jest } from '@jest/globals';
import { Role } from '../../src/types/enums';

jest.mock('../../src/lib/auth', () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === 'validtoken') {
      return { id: '123', user: { role: 'admin' } };
    }
    if (token === 'usertoken') {
      return { id: '456', user: { role: 'user' } };
    }
    if (token === 'curatortoken') {
      return { id: '789', user: { role: 'curator' } };
    }
    return null;
  }),
  verifyCookie: jest.fn(async (cookie: string) => {
    if (cookie === 'validcookie') {
      return { id: '123', user: { role: 'admin' } };
    }
    if (cookie === 'usercookie') {
      return { id: '456', user: { role: 'user' } };
    }
    if (cookie === 'curatorcookie') {
      return { id: '789', user: { role: 'curator' }};
    }
    return null;
  }),
}));

describe('verification middleware (unit)', () => {
  it('should call next for valid token/cookie', async () => {
    const req = { headers: { authorization: 'Bearer validtoken' }, cookies: { session: 'validcookie' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verifyUser()(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('should send error for missing token/cookie', async () => {
    const req = { headers: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verifyUser()(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  describe('handle role-based authorization for different user roles using token', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    // Test USER role with no requirements - should pass
    it('should return USER role', async () => {
      const req = { headers: { authorization: 'Bearer usertoken' }, cookies: {} };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('user');
    })

    it('should return CURATOR role', async () => {
      const req = { headers: { authorization: 'Bearer curatortoken' }, cookies: {} };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('curator');
    })

    it('should return ADMIN role', async () => {
      const req = { headers: { authorization: 'Bearer validtoken' }, cookies: {} };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('admin');
    })
    
  });

  describe('handle role-based authorization for different user roles using cookie', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    // Test USER role with no requirements - should pass
    it('should return USER role', async () => {
      const req = { headers: {}, cookies: { session: 'usercookie'} };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('user');
    })

    it('should return CURATOR role', async () => {
      const req = { headers: {}, cookies: { session: 'curatorcookie'} };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('curator');
    })

    it('should return ADMIN role', async () => {
      const req = { headers: {}, cookies: { session: 'validcookie' } };
      await verifyUser()(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.user.role).toBe('admin');
    })
    
  });
});
