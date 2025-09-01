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
    return null;
  }),
}));

jest.mock('../../src/repositories/userRepository', () => ({
  findFirestoreUserById: jest.fn(async (id: string) => {
    if (id === '789') {
      return { docs: [{ data: () => ({ is_verified: true }) }] };
    }
    return null;
  }),
}));

describe('verification middleware', () => {
  it('should be a function', () => {
    expect(typeof verifyUser).toBe('function');
  });

  it('should call next for valid token/cookie (mocked)', async () => {
    const req = { headers: { authorization: 'Bearer validtoken' }, cookies: { session: 'validcookie' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    // You should mock verifyToken/verifyCookie for real integration
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

  it('should handle role-based authorization for different user roles', async () => {
    const req = { headers: { authorization: 'Bearer usertoken' }, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    // Test USER role with no requirements - should pass
    await verifyUser()(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user.user.role).toBe('user');
  });

  it('should verify curator with proper verification status', async () => {
    const req = { headers: { authorization: 'Bearer curatortoken' }, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    
    // Test curator role with verification requirement
    await verifyUser(Role.CURATOR)(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user.user.role).toBe('curator');
  });
});
