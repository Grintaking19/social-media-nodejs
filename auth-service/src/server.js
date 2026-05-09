import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth-routes.js";
import logger from "./utils/logger.js";
import helmet from "helmet";
import cors from "cors";
import { connectDB, disconnectDB } from "./database/db.js";
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

// Create App for auth-service
const app = express();
const PORT = process.env.PORT || 3001;

// Redis Client
const redisClient = new Redis(process.env.REDIS_URL);



// Connect to MongoDB
connectDB()
  .then(() => {
    logger.info("Connected to MongoDB successfully");
  })
  .catch((error) => {
    logger.error("MongoDB Connection Error", error);
    process.exit(1);
  });

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  logger.info(`Received method: ${req.method}, URL: ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

// DDos Protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // Number of requests allowed
  duration: 60, // Per 60 seconds
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate Limit exceeded for IP : ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too Many Requests",
      });
    });
});

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too Many Requests Have Been Sent",
    });
  },
  store: new RedisStore({
    sendCommand: (command, ...args) => redisClient.call(command, ...args),
  }),
});

// Apply it on register endpoint
app.use("/api/auth/register", sensitiveEndpointLimiter);

// Apply Error Handler
app.use(errorHandler);

// Routes
app.use("/api/auth", authRoutes);

const server = app.listen(PORT, () => {
  logger.info(`Auth Service is running on Port ${PORT}`);
});


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
