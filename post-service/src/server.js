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

//  RateLimiter for sensitive endpoints and IP rate limiting for DDOS attacks
const ipRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 60,
});

app.use((req, res, next) => {});

const apiRateLimiter = rateLimit({
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
// Middleware Needed:
app.use(helmet());
app.use(cors());
app.use(express.json());

// logger for request method - url - body
app.use((req, res, next) => {
  logger.info(`Received method: ${req.method}, URL: ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

// routes -> pass redisClient to routes
//  /api/posts

// errorHandler

// Listen for port

// Implement Service/proxy factory for api-gateway

// Event Emitters for unhandled rejections
