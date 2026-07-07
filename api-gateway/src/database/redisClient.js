import Redis from "ioredis";
import logger from "../utils/logger.js";

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => logger.info("Redis client is connecting..."));
redisClient.on("ready", () => logger.info("Redis client is ready"));
redisClient.on("error", (err) => logger.error("Redis error:", err));

export default redisClient;