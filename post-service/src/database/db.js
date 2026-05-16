import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection Error", error);
    console.error("MongoDB Connection Failed: ", error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info("Disconnected to MongoDB");
  console.log("MongoDB Disconnected!");
};

// Event Listeners
mongoose.connection.on("disconnected", () =>
  console.log("MongoDB Disconnected"),
);

mongoose.connection.on("error", (err) =>
  console.log("Error in connection to DB:", err),
);

export { connectDB, disconnectDB };
