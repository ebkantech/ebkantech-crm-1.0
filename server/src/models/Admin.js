import mongoose from "mongoose";
import { createAccountSchema } from "./accountSchema.js";

// Admin + Super Admin — same shape as Staff, kept in its own collection so
// the two tiers of account are physically separated, not just role-tagged.
export default mongoose.model("Admin", createAccountSchema(), "admins");
