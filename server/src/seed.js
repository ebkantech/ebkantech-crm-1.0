import "dotenv/config";
import { connectDB } from "./db.js";
import mongoose from "mongoose";
import Tenant from "./models/Tenant.js";
import Admin from "./models/Admin.js";
import Staff from "./models/Staff.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import Lead from "./models/Lead.js";
import Message from "./models/Message.js";
import Outreach from "./models/Outreach.js";
import { TENANTS, STAFF, PROJECTS, TASKS, LEADS, MESSAGES, OUTREACH, SEED_PASSWORD } from "./seedData.js";
import { hashPassword } from "./utils/password.js";
import { collectionFor } from "./accounts.js";

async function run() {
  await connectDB();

  await Promise.all([
    Tenant.deleteMany({}),
    Admin.deleteMany({}),
    Staff.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Lead.deleteMany({}),
    Message.deleteMany({}),
    Outreach.deleteMany({}),
  ]);

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const withPasswords = STAFF.map((s) => ({ ...s, passwordHash }));
  const admins = withPasswords.filter((s) => collectionFor(s.role) === Admin);
  const staffOnly = withPasswords.filter((s) => collectionFor(s.role) === Staff);

  await Tenant.insertMany(TENANTS);
  await Admin.insertMany(admins);
  await Staff.insertMany(staffOnly);
  await Project.insertMany(PROJECTS);
  await Task.insertMany(TASKS);
  await Lead.insertMany(LEADS);
  await Message.insertMany(MESSAGES);
  await Outreach.insertMany(OUTREACH);

  console.log("Seeded:", {
    tenants: TENANTS.length,
    admins: admins.length,
    staff: staffOnly.length,
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
