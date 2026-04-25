import {ensureRedisConnection} from "../configs/redis";
import {devLog} from "./dev";

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const redis = await ensureRedisConnection();
    const data = await redis.get(key);
    if (!data) {
      devLog(`[SmartCache] Redis MISS: ${key}`);
      return null;
    }
    devLog(`[SmartCache] Redis HIT: ${key}`);
    return JSON.parse(data) as T;
  } catch (err) {
    devLog(`[SmartCache] Redis getCache error: ${err}`);
    return null;
  }
};

export const setCache = async <T extends object>(
  key: string,
  value: T,
  ttl: number
): Promise<void> => {
  try {
    const redis = await ensureRedisConnection();
    await redis.set(key, JSON.stringify(value), {EX: ttl});
    devLog(`[SmartCache] Redis SET: ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    devLog(`[SmartCache] Redis setCache error: ${err}`);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    const redis = await ensureRedisConnection();
    await redis.del(key);
    devLog(`[SmartCache] Redis DEL: ${key}`);
  } catch (err) {
    devLog(`[SmartCache] Redis deleteCache error: ${err}`);
  }
};

export const getCacheKeys = async (pattern: string): Promise<string[]> => {
  try {
    const redis = await ensureRedisConnection();
    let cursor = "0";
    const keys: string[] = [];

    do {
      const {cursor: nextCursor, keys: foundKeys} = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = nextCursor;
      if (foundKeys.length > 0) {
        keys.push(...foundKeys);
      }
    } while (cursor !== "0");

    devLog(`[SmartCache] Redis SCAN: pattern=${pattern} found=${keys.length} keys`);
    return keys;
  } catch (err) {
    devLog(`[SmartCache] Redis getCacheKeys error: ${err}`);
    return [];
  }
};

export const deleteCachePattern = async (pattern: string) => {
  try {
    const keys = await getCacheKeys(pattern);
    if (keys.length > 0) {
      const redis = await ensureRedisConnection();
      await redis.del(keys);
      devLog(`[SmartCache] Redis DEL PATTERN: ${pattern} deleted=${keys.length} keys`);
    }
  } catch (err) {
    devLog(`[SmartCache] Redis deleteCachePattern error: ${err}`);
  }
};
