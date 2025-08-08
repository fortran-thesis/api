import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redis: RedisClientType = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

redis.on("error", (err: Error) => console.log("Redis Client Error", err));

// Ensure connection is established before use
const redisReady = redis.connect();

export const disconnectRedis = async () => {
  if (redis.isOpen) {
    await redis.destroy();
  }
};
export { redis, redisReady };
