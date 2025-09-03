import { createClient, RedisClientType } from "redis";
import { envOptions } from "./environment";

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

// Ensure connection is established before use
const redisReady = redis.connect();

export const disconnectRedis = async () => {
  if (redis.isOpen) {
    await redis.destroy();
  }
};
export { redis, redisReady };
