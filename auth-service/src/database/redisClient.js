import Redis from 'ioredis';
import logger from '../utils/logger.js';

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => logger.info("Redis connected"));
redisClient.on("error", (err) => logger.error("Redis error:", err));

redisClient
  .connect()
  .then(() => {
    logger.info("Connected to Redis Client successfully");
  })
  .catch((error) => {
    logger.error("Redis Connection Error", error);
    process.exit(1);
  });


export default redisClient;