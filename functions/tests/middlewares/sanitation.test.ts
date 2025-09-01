import { sanitizeBody, sanitizeParams } from '../../src/middlewares/sanitation';
import { describe, it, expect, jest } from '@jest/globals';

describe('sanitation middleware', () => {
  it('should sanitize body strings', () => {
    const req = { body: { name: '<b>Test</b>\x01 ' } };
    const res = {};
    const next = jest.fn();
    sanitizeBody(req as any, res as any, next);
    expect(req.body.name).toBe('Test');
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize params strings', () => {
    const req = { params: { id: '<script>123</script>\x02 ' } };
    const res = {};
    const next = jest.fn();
    sanitizeParams(req as any, res as any, next);
    expect(req.params.id).toBe('123');
    expect(next).toHaveBeenCalled();
  });
});
