import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ebkantech-crm";
  mongoose.connection.on("connected", () => console.log("MongoDB connected:", uri));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
  await mongoose.connect(uri);
}
