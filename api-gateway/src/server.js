import express from "express";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "./utils/logger.js";
import proxy from "express-http-proxy";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Redis Client
const redisClient = new Redis(process.env.REDIS_URL);

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res
      .status(429)
      .json({ message: "Too many requests, please try again later." });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimiter);

// Logging
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// Setting up Proxies
const proxyOptions = {
  // Resolve the path to forward to the Service
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  // Handle Proxy Errors (e.g., Service Unavailable)
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err}`);
    res.status(500).json({
      message: `Internal server error`,
      error: err.message,
    });
  },
};

app.use(
  "/v1/auth",
  proxy(process.env.AUTH_SERVICE_URL, {
    ...proxyOptions,
    // Modify Request before forwarding to Service
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    // Modify Response before sending back to Client
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Auth Service: ${proxyRes.statusCode}`,
      );

      return proxyResData;
    },
  }),
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Auth Service is running on port ${process.env.AUTH_SERVICE_URL}`,
  );
  logger.info(`Redis URL ${process.env.REDIS_URL}`);
});
