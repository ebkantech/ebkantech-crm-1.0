import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const ThreadEventSchema = new mongoose.Schema(
  {
    ch: { type: String, required: true, enum: ["whatsapp", "email", "call", "note"] },
    dir: { type: String, required: true, enum: ["in", "out"] },
    at: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false }
);

const LeadSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    company: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    pan: { type: String, default: "" },
    source: { type: String, required: true },
    stage: { type: String, required: true, enum: ["new", "qualified", "proposal", "negotiation", "won", "lost"] },
    owner: { type: String, default: "Unassigned" },
    value: { type: Number, default: 0 },
    lastTouch: { type: String, required: true },
    thread: { type: [ThreadEventSchema], default: [] },
  },
  idSchemaOptions
);

export default mongoose.model("Lead", LeadSchema);
