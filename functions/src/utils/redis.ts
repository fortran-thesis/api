import { redis, redisReady } from '../configs/redis';
import { devLog } from './dev';

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    await redisReady;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    devLog('Redis getCache error:' + err);
    return null;
  }
};

export const setCache = async <T extends object>(key: string, value: T, ttl: number): Promise<void> => {
  try {
    await redisReady;
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    devLog('Redis setCache error:' + err);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisReady;
    await redis.del(key);
  } catch (err) {
    devLog('Redis deleteCache error:' + err);
  }
};

export const deleteCachePattern = async (pattern: string) => {
  try {
    let cursor = '0';
    let keys: string[] = [];
    do {
      const [nextCursor, foundKeys] = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = nextCursor;
      if (foundKeys.length > 0) {
        keys.push(...foundKeys);
      }
    } while (cursor !== '0');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    devLog(err);
  }
};