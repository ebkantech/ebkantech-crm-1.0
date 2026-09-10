import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const MessageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    by: { type: String, required: true },
    at: { type: String, required: true },
    body: { type: String, required: true },
    lead: { type: String, default: null },
  },
  idSchemaOptions
);

export default mongoose.model("Message", MessageSchema);
