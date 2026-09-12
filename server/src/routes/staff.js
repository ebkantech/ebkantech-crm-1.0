import { Router } from "express";
import crypto from "crypto";
import validator from "validator";
import { ROLES, can } from "../constants/roles.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { hashPassword } from "../utils/password.js";
import { generateResetToken } from "../utils/tokens.js";
import { sendWelcomeEmail } from "../mail.js";
import { collectionFor, emailTaken, findAccountById, listAllAccounts } from "../accounts.js";

const router = Router();
const SETUP_TOKEN_MINUTES = 30;

router.use(requireAuth);

/* Everyone signed in can see the staff directory (names/roles show up all
 * over the app — task assignees, project teams, chat authors), merged from
 * both the admins and staff collections. Email addresses are only exposed
 * to whoever can actually manage accounts. */
router.get("/", async (req, res) => {
  const accounts = await listAllAccounts();
  const seeEmails = can(req.user, "team.manage");
  res.json(
    accounts.map((s) => {
      const json = s.toJSON();
      if (!seeEmails && s.id !== req.user.id) delete json.email;
      return json;
    })
  );
});

router.post("/", requirePermission("team.manage"), async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const role = String(req.body.role || "");

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!validator.isEmail(email)) return res.status(400).json({ error: "A valid email is required" });
  if (!ROLES[role]) return res.status(400).json({ error: "Unknown role" });

  if (await emailTaken(email)) return res.status(409).json({ error: "Someone already has an account with that email" });

  // Placeholder password nobody knows or can derive — the account only
  // becomes usable once the invite link below is used to set a real one.
  const placeholder = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const { raw, hash } = generateResetToken();

  const Model = collectionFor(role);
  const prefix = Model.modelName === "Admin" ? "a" : "u";
  const staff = await Model.create({
    _id: prefix + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100),
    name,
    email,
    role,
    passwordHash: placeholder,
    resetTokenHash: hash,
    resetTokenExpires: new Date(Date.now() + SETUP_TOKEN_MINUTES * 60000),
  });

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const setupUrl = `${appUrl}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
  try {
    await sendWelcomeEmail(email, name, setupUrl);
  } catch (err) {
    console.error("Failed to send welcome email:", err.message);
    if (process.env.NODE_ENV !== "production") console.log("[dev only] setup link:", setupUrl);
  }

  res.status(201).json(staff);
});

router.patch("/:id", requirePermission("team.manage"), async (req, res) => {
  const { account, Model: CurrentModel } = await findAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: "Not found" });

  const updates = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
  if (req.body.active !== undefined) updates.active = !!req.body.active;

  let nextRole = account.role;
  if (req.body.role !== undefined) {
    if (!ROLES[req.body.role]) return res.status(400).json({ error: "Unknown role" });
    nextRole = req.body.role;
    updates.role = nextRole;
  }

  if (req.params.id === req.user.id && updates.active === false) {
    return res.status(400).json({ error: "You can't deactivate your own account" });
  }

  const TargetModel = collectionFor(nextRole);

  if (TargetModel !== CurrentModel) {
    // Promotion/demotion across the admin/staff line — the document has to
    // physically move to the other collection, same id and everything else.
    const plain = account.toObject();
    Object.assign(plain, updates);
    await CurrentModel.deleteOne({ _id: account.id });
    const moved = await TargetModel.create(plain);
    return res.json(moved);
  }

  Object.assign(account, updates);
  await account.save();
  res.json(account);
});

export default router;
