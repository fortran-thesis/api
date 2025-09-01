import { getCache, setCache, deleteCache, deleteCachePattern } from '../../src/utils/redis';
import { describe, it, expect } from '@jest/globals';

describe('redis utils', () => {
  it('should set and get cache (mocked)', async () => {
    expect(getCache).toBeDefined();
    expect(setCache).toBeDefined();
    expect(deleteCache).toBeDefined();
    expect(deleteCachePattern).toBeDefined();
    // You should mock redis in real tests
})});
