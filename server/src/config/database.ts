import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app";

export const connectDB = async (clearDB = false) => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");

    if (clearDB) {
      console.log("Clearing database collections...");
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection is not established");
      }
      const collections = await db.collections();
      for (let collection of collections) {
        await collection.deleteMany({});
      }
      console.log("All collections cleared");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
