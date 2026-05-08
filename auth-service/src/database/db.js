import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error("MongoDB Connection Failed: ", error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
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
