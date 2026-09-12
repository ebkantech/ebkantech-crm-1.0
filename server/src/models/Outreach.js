import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const SendLogSchema = new mongoose.Schema(
  {
    step: { type: String, required: true },
    channel: { type: String, required: true },
    at: { type: String, required: true },
  },
  { _id: false }
);

const OutreachSchema = new mongoose.Schema(
  {
    _id: { type: String },
    company: { type: String, required: true },
    domain: { type: String, default: "" },
    email: { type: String, required: true },
    contact: { type: String, default: null },
    mobile: { type: String, default: null },
    region: { type: String, required: true }, // "sa" = Saudi Arabia; anything else is out-of-territory
    segment: { type: String, required: true },
    step: { type: Number, default: 0 }, // cursor into SEQUENCE
    started: { type: String, required: true },
    touched: { type: String, default: null },
    state: { type: String, default: "active", enum: ["active", "replied", "suppressed"] },
    parked: { type: Boolean, default: false },
    sendLog: { type: [SendLogSchema], default: [] },
  },
  idSchemaOptions
);

export default mongoose.model("Outreach", OutreachSchema);
