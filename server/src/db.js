import mongoose from "mongoose";

// Never log the URI as-is — it carries the DB password in plain text
// (Atlas connection strings especially). This strips user:pass@ before printing.
const redact = (uri) => uri.replace(/\/\/[^/@]+@/, "//***:***@");

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ebkantech-crm";
  mongoose.connection.on("connected", () => console.log("MongoDB connected:", redact(uri)));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
  await mongoose.connect(uri);
}
