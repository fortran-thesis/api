import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisOptions: any = {
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};

if (process.env.REDIS_USERNAME) {
  redisOptions.username = process.env.REDIS_USERNAME;
}
if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

const redis: RedisClientType = createClient(redisOptions);

redis.on("error", (err: Error) => console.log("Redis Client Error", err));

// Ensure connection is established before use
const redisReady = redis.connect();

export const disconnectRedis = async () => {
  if (redis.isOpen) {
    await redis.destroy();
  }
};
export { redis, redisReady };
