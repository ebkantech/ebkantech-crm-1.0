import "dotenv/config";
import { connectDB } from "./db.js";
import mongoose from "mongoose";
import Tenant from "./models/Tenant.js";
import Staff from "./models/Staff.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import Lead from "./models/Lead.js";
import Message from "./models/Message.js";
import Outreach from "./models/Outreach.js";
import { TENANTS, STAFF, PROJECTS, TASKS, LEADS, MESSAGES, OUTREACH, SEED_PASSWORD } from "./seedData.js";
import { hashPassword } from "./utils/password.js";

async function run() {
  await connectDB();

  await Promise.all([
    Tenant.deleteMany({}),
    Staff.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Lead.deleteMany({}),
    Message.deleteMany({}),
    Outreach.deleteMany({}),
  ]);

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const staffWithPasswords = STAFF.map((s) => ({ ...s, passwordHash }));

  await Tenant.insertMany(TENANTS);
  await Staff.insertMany(staffWithPasswords);
  await Project.insertMany(PROJECTS);
  await Task.insertMany(TASKS);
  await Lead.insertMany(LEADS);
  await Message.insertMany(MESSAGES);
  await Outreach.insertMany(OUTREACH);

  console.log("Seeded:", {
    tenants: TENANTS.length,
    staff: STAFF.length,
    projects: PROJECTS.length,
    tasks: TASKS.length,
    leads: LEADS.length,
    messages: MESSAGES.length,
    outreach: OUTREACH.length,
  });
  console.log("\nDemo logins — password for every seeded account:", SEED_PASSWORD);
  STAFF.forEach((s) => console.log(`  ${s.email}  (${s.role})`));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
