import dotenv from "dotenv";
import express from "express";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler.js";
import {connectDB, disconnectDB} from "./database/db.js"
import postRoutes from "./routes/post-routes.js";

dotenv.config();

// Create app
const app = express();
const PORT = process.env.PORT || 3002;

// connect to mongoDB
mongoose.connect
