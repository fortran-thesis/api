import { upload, fileFilter } from '../../src/middlewares/upload';
import { describe, it, expect, jest } from '@jest/globals';

describe('upload middleware', () => {
  it('should be defined and have memoryStorage', () => {
    expect(upload).toBeDefined();
  expect(typeof upload).toBe('object');
  });

  it('should reject unsupported file types', () => {
    const cb = jest.fn();
    const req = {};
    const file = { mimetype: 'application/pdf' };
    fileFilter(req as any, file as any, cb);
    expect(cb).toHaveBeenCalledWith(null, false);
  });

  it('should accept supported file types', () => {
    const cb = jest.fn();
    const req = {};
    const file = { mimetype: 'image/png' };
    fileFilter(req as any, file as any, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });
});
