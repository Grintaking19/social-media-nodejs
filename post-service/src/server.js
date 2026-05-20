import dotenv from "dotenv";
import express from "express";
import logger from "./utils/logger.js";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler.js";
import { connectDB, disconnectDB } from "./database/db.js";
import postRoutes from "./routes/post-routes.js";

dotenv.config();

// Create app
const app = express();
const PORT = process.env.PORT || 3002;

// Connect to mongoDB
connectDB();

// Redis Client
const redisClient = new Redis(process.env.REDIS_URL);

// Middleware Needed:
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received method: ${req.method}, URL: ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

const ipRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 60,
});

// Use IP-based rate limiter for all routes
app.use((req, res, next) => {
  ipRateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate Limit exceeded for IP : ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too Many Requests Have Been Sent",
      });
    });
});

const routeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      `Sensitive endpoint - ${req.url} -  rate limit exceeded for IP: ${req.ip}`,
    );
    res.status(429).json({
      success: false,
      message: "Too Many Requests Have Been Sent",
    });
  },
  store: new RedisStore({
    sendCommand: (command, ...args) => redisClient.call(command, ...args),
  }),
});

// Pass the Redis client to routes via middleware
app.use((req, res, next) => {
  redisClient
    .connect()
    .catch(logger.error("Error in connecting to Redis Client"));
  req.redis = redisClient;
  next();
});

app.use("/api/post", postRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Post Service is running on port ${PORT}`);
});

// Implement Service/proxy factory for api-gateway

// Event Emitters for unhandled rejections
// Unhandled promise rejections (e.g. missing await on DB connect)
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

// Uncaught synchronous exceptions
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(0);
});

// Cloud/container shutdown (Heroku, Docker, PM2...)
process.on("SIGTERM", () => {
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

// Local shutdown (Ctrl+C, nodemon restarts)
process.on("SIGINT", () => {
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
