import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const TaskSchema = new mongoose.Schema(
  {
    _id: { type: String },
    project: { type: String, required: true },
    parent: { type: String, default: null },
    title: { type: String, required: true },
    by: { type: String, required: true },
    to: { type: String, required: true },
    due: { type: String, required: true },
    status: { type: String, required: true, enum: ["todo", "doing", "blocked", "review", "done"] },
    why: { type: String },
  },
  idSchemaOptions
);

export default mongoose.model("Task", TaskSchema);
