import mongoose from "mongoose";
import { idSchemaOptions } from "./plugin.js";

const TeamMemberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    part: { type: String, required: true },
    alloc: { type: Number, required: true },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    client: { type: String, required: true },
    leadRef: { type: String, default: null },
    due: { type: String, required: true },
    fee: { type: Number, default: 0 },
    team: { type: [TeamMemberSchema], default: [] },
    // each milestone is stored as [label, done] to match the existing app shape
    milestones: { type: [[mongoose.Schema.Types.Mixed]], default: [] },
  },
  idSchemaOptions
);

export default mongoose.model("Project", ProjectSchema);
