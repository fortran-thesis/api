import {createClient, RedisClientType} from "redis";
import {envOptions} from "./environment";

// Lazy initialization - client is created on first use, not at module load
let redis: RedisClientType<any> | null = null;
let redisReady: Promise<RedisClientType<any>> | null = null;

const createRedisClient = (): RedisClientType<any> => {
  const redisOptions: any = {
    socket: {
      host: envOptions.redisHost,
      port: Number(envOptions.redisPort),
      // Reconnection strategy with exponential backoff
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("Redis: Max reconnection attempts reached, giving up");
          return new Error("Max reconnection attempts reached");
        }
        // Exponential backoff: 100ms, 200ms, 400ms, ... up to 30s
        const delay = Math.min(100 * Math.pow(2, retries), 30000);
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries + 1})`);
        return delay;
      },
    },
  };

  if (envOptions.redisUsername) {
    redisOptions.username = envOptions.redisUsername;
  }
  if (envOptions.redisPassword) {
    redisOptions.password = envOptions.redisPassword;
  }

  const client = createClient(redisOptions);
  client.on("error", (err: Error) => console.log("Redis Client Error", err));
  client.on("reconnecting", () => console.log("Redis: Reconnecting..."));
  client.on("ready", () => console.log("Redis: Connected and ready"));
  return client as RedisClientType<any>;
};

const ensureRedisConnection = async (): Promise<RedisClientType<any>> => {
  // Skip Redis entirely in test environment (no Redis server available)
  if (envOptions.isTest) {
    throw new Error("Redis is disabled in test environment");
  }

  if (!redis) {
    redis = createRedisClient();
  }

  if (!redisReady) {
    redisReady = redis.connect().catch((err) => {
      console.error("Failed to connect to Redis:", err);
      // Reset so next call attempts reconnection
      redisReady = null;
      return redis as RedisClientType<any>;
    });
  }

  return redisReady;
};

const getRedisClient = async (): Promise<RedisClientType<any>> => {
  // Always ensure connection is established before returning client
  return ensureRedisConnection();
};

export const disconnectRedis = async () => {
  if (redis?.isOpen) {
    await redis.destroy();
  }
};

export {ensureRedisConnection, getRedisClient, redisReady};
