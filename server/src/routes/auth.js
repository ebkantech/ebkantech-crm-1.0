import { Router } from "express";
import rateLimit from "express-rate-limit";
import Staff from "../models/Staff.js";
import { hashPassword, verifyPassword, passwordPolicyError } from "../utils/password.js";
import { issueSession, generateResetToken, hashResetToken, SESSION_COOKIE_MAX_AGE_MS } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "../mail.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// A plain lowercase/trim — not validator's normalizeEmail, which rewrites
// gmail-style addresses (drops dots, strips +tags) and could stop matching
// what's actually stored for a non-gmail domain.
const normEmail = (s) => String(s || "").trim().toLowerCase();

const LOCK_AFTER_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_MINUTES = 30;

const isProd = process.env.NODE_ENV === "production";
const cookieOpts = (maxAge, { httpOnly } = { httpOnly: true }) => ({
  httpOnly,
  secure: isProd, // https only in production; dev runs on plain http://localhost
  sameSite: "lax",
  path: "/",
  maxAge,
});

function setSessionCookies(res, user) {
  const { token, csrf } = issueSession(user);
  res.cookie("ebkan_token", token, cookieOpts(SESSION_COOKIE_MAX_AGE_MS));
  // readable by JS on purpose — it's mirrored back as the X-CSRF-Token header (double-submit pattern)
  res.cookie("ebkan_csrf", csrf, cookieOpts(SESSION_COOKIE_MAX_AGE_MS, { httpOnly: false }));
}

function clearSessionCookies(res) {
  res.clearCookie("ebkan_token", { path: "/" });
  res.clearCookie("ebkan_csrf", { path: "/" });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || "");
  const GENERIC = "Incorrect email or password";
  if (!email || !password) return res.status(400).json({ error: GENERIC });

  const user = await Staff.findOne({ email });
  if (!user) return res.status(401).json({ error: GENERIC });

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil - new Date()) / 60000);
    return res.status(423).json({ error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` });
  }

  if (!user.active) return res.status(401).json({ error: GENERIC });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOCK_AFTER_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({ error: GENERIC });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  setSessionCookies(res, user);
  res.json(user);
});

router.post("/logout", (req, res) => {
  clearSessionCookies(res);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => res.json(req.user));

/* Public: tells the login screen whether to offer "set up the first admin
 * account" at all. True only for a completely empty install. */
router.get("/bootstrap-status", async (_req, res) => {
  const count = await Staff.countDocuments();
  res.json({ needsSetup: count === 0 });
});

/* Self-service signup exists for exactly one moment: a brand-new install
 * with zero accounts. It always creates an admin (there's no one else yet
 * to hand out roles) and closes itself the instant one account exists —
 * every account after that comes from an existing admin's invite. */
router.post("/signup", loginLimiter, async (req, res) => {
  const count = await Staff.countDocuments();
  if (count > 0) return res.status(403).json({ error: "Signup is closed. Ask an admin at your firm for an invite." });

  const name = String(req.body.name || "").trim();
  const email = normEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "A valid email is required" });
  const policyError = passwordPolicyError(password);
  if (policyError) return res.status(400).json({ error: policyError });

  let user;
  try {
    user = await Staff.create({
      _id: "u" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100),
      name,
      email,
      role: "admin",
      passwordHash: await hashPassword(password),
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Signup is closed. Ask an admin at your firm for an invite." });
    throw err;
  }

  setSessionCookies(res, user);
  res.status(201).json(user);
});

/* Always answers the same way whether or not the address is on file, so a
 * caller can't use this endpoint to find out who has an account. */
router.post("/forgot-password", forgotLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  const GENERIC = { ok: true, message: "If that email has an account, a reset link is on its way." };
  if (!email) return res.json(GENERIC);

  const user = await Staff.findOne({ email, active: true });
  if (user) {
    const { raw, hash } = generateResetToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60000);
    await user.save();

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error("Failed to send reset email:", err.message);
      // No SMTP configured yet — dev fallback so the flow is still testable locally.
      if (!isProd) console.log("[dev only] reset link:", resetUrl);
    }
  }

  res.json(GENERIC);
});

router.post("/reset-password", async (req, res) => {
  const email = normEmail(req.body.email);
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");

  const policyError = passwordPolicyError(password);
  if (policyError) return res.status(400).json({ error: policyError });

  const user = await Staff.findOne({ email });
  if (!user || !user.resetTokenHash || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }
  if (hashResetToken(token) !== user.resetTokenHash) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  setSessionCookies(res, user);
  res.json(user);
});

router.post("/change-password", requireAuth, async (req, res) => {
  const current = String(req.body.currentPassword || "");
  const next = String(req.body.newPassword || "");

  const policyError = passwordPolicyError(next);
  if (policyError) return res.status(400).json({ error: policyError });

  const ok = await verifyPassword(current, req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  req.user.passwordHash = await hashPassword(next);
  await req.user.save();
  res.json({ ok: true });
});

export default router;
