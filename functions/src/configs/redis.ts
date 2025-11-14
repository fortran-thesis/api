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
  return client as RedisClientType<any>;
};

const ensureRedisConnection = async (): Promise<RedisClientType<any>> => {
  if (!redis) {
    redis = createRedisClient();
  }
  
  if (!redisReady) {
    redisReady = redis.connect().catch((err) => {
      console.error("Failed to connect to Redis:", err);
      return redis as RedisClientType<any>;
    });
  }
  
  return redisReady;
};

const getRedisClient = async (): Promise<RedisClientType<any>> => {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis as RedisClientType<any>;
};

export const disconnectRedis = async () => {
  if (redis?.isOpen) {
    await redis.destroy();
  }
};

export {ensureRedisConnection, getRedisClient, redisReady};
