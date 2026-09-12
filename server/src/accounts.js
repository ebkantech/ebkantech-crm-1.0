import Admin from "./models/Admin.js";
import Staff from "./models/Staff.js";

const ADMIN_ROLES = new Set(["superadmin", "admin"]);

// Which collection a role belongs in. Everything that creates or moves an
// account goes through this — it's the one place that decides the split.
export const collectionFor = (role) => (ADMIN_ROLES.has(role) ? Admin : Staff);

/* Email must be unique across BOTH collections, but Mongoose's unique index
 * only covers one collection at a time — so this is the actual check. */
export async function findAccountByEmail(email) {
  const admin = await Admin.findOne({ email });
  if (admin) return admin;
  return Staff.findOne({ email });
}

export async function emailTaken(email, excludeId = null) {
  const existing = await findAccountByEmail(email);
  return !!existing && existing.id !== excludeId;
}

/* IDs are unique across both collections by construction (this app never
 * reuses an id), so trying Admin first and falling back to Staff is enough —
 * no need to encode which collection an id came from anywhere else. */
export async function findAccountById(id) {
  const admin = await Admin.findById(id);
  if (admin) return { account: admin, Model: Admin };
  const staff = await Staff.findById(id);
  if (staff) return { account: staff, Model: Staff };
  return { account: null, Model: null };
}

export async function listAllAccounts() {
  const [admins, staff] = await Promise.all([Admin.find().sort({ _id: 1 }), Staff.find().sort({ _id: 1 })]);
  return [...admins, ...staff];
}

export async function countAllAccounts() {
  const [a, s] = await Promise.all([Admin.countDocuments(), Staff.countDocuments()]);
  return a + s;
}
