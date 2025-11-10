import {createClient, RedisClientType} from "redis";
import {envOptions} from "./environment";

const redisOptions: any = {
  socket: {
    host: envOptions.redisHost,
    port: Number(envOptions.redisPort),
  },
};

if (envOptions.redisUsername) {
  redisOptions.username = envOptions.redisUsername;
}
if (envOptions.redisPassword) {
  redisOptions.password = envOptions.redisPassword;
}

const redis: RedisClientType = createClient(redisOptions);

redis.on("error", (err: Error) => console.log("Redis Client Error", err));

// Lazy connection - only connect when first used, not on module load
let redisReady: Promise<RedisClientType> | null = null;

const ensureRedisConnection = async (): Promise<RedisClientType> => {
  if (!redisReady) {
    redisReady = redis.connect().catch((err) => {
      console.error("Failed to connect to Redis:", err);
      // Return the redis client anyway so code doesn't crash
      return redis;
    });
  }
  return redisReady;
};

export const disconnectRedis = async () => {
  if (redis.isOpen) {
    await redis.destroy();
  }
};
export {redis, ensureRedisConnection, redisReady};
