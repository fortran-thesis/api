import { verifyUser } from '../../src/middlewares/verification';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../../src/lib/auth', () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === 'validtoken') {
      return { id: '123', user: { role: 'ADMIN' } };
    }
    return null;
  }),
  verifyCookie: jest.fn(async (cookie: string) => {
    if (cookie === 'validcookie') {
      return { id: '123', user: { role: 'ADMIN' } };
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
});
