import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const TenantSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    gstin: { type: String, required: true },
  },
  idSchemaOptions
);

export default mongoose.model("Tenant", TenantSchema);
