import mongoose from "mongoose";
import { createAccountSchema } from "./accountSchema.js";

// Non-admin roles: sales, associate, developer, designer, auditor.
// Third argument pins the actual MongoDB collection name to "staff".
export default mongoose.model("Staff", createAccountSchema(), "staff");
