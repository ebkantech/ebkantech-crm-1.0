import { Router } from "express";
import crypto from "crypto";
import validator from "validator";
import Staff from "../models/Staff.js";
import { ROLES, can } from "../constants/roles.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { hashPassword } from "../utils/password.js";
import { generateResetToken } from "../utils/tokens.js";
import { sendWelcomeEmail } from "../mail.js";

const router = Router();
const SETUP_TOKEN_MINUTES = 30;

router.use(requireAuth);

/* Everyone signed in can see the staff directory (names/roles show up all
 * over the app — task assignees, project teams, chat authors). Email
 * addresses are only exposed to whoever can actually manage accounts. */
router.get("/", async (req, res) => {
  const staff = await Staff.find().sort({ _id: 1 });
  const seeEmails = can(req.user, "team.manage");
  res.json(
    staff.map((s) => {
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

  const existing = await Staff.findOne({ email });
  if (existing) return res.status(409).json({ error: "Someone already has an account with that email" });

  // Placeholder password nobody knows or can derive — the account only
  // becomes usable once the invite link below is used to set a real one.
  const placeholder = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const { raw, hash } = generateResetToken();

  const staff = await Staff.create({
    _id: "u" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100),
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
  const updates = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
  if (req.body.role !== undefined) {
    if (!ROLES[req.body.role]) return res.status(400).json({ error: "Unknown role" });
    updates.role = req.body.role;
  }
  if (req.body.active !== undefined) updates.active = !!req.body.active;

  if (req.params.id === req.user.id && updates.active === false) {
    return res.status(400).json({ error: "You can't deactivate your own account" });
  }

  const staff = await Staff.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!staff) return res.status(404).json({ error: "Not found" });
  res.json(staff);
});

export default router;
