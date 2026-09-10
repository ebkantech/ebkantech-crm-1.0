import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// index.js already loads server/.env via "dotenv/config", but that call
// resolves .env against process.cwd() — if this file (or anything that
// imports it) ever runs directly from a different working directory (an
// IDE "run this file" button, a one-off script), that lookup misses the
// file entirely and JWT_SECRET comes back empty. Resolving the path from
// this file's own location instead makes it work no matter what invoked
// it. dotenv never overwrites a variable that's already set, so this is a
// no-op when index.js already loaded it correctly.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set in the environment to at least 32 characters — see server/.env.example");
}

const SESSION_TTL = "7d";
export const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/* The access token carries a random `csrf` claim; the same value is set as
 * a separate, non-httpOnly cookie. A same-origin page can read that cookie
 * and echo it back as a header, a cross-site attacker forging a request
 * cannot — that's the whole double-submit defense. */
export function issueSession(user) {
  const csrf = crypto.randomBytes(24).toString("hex");
  const token = jwt.sign({ sub: user.id, role: user.role, csrf }, SECRET, { expiresIn: SESSION_TTL });
  return { token, csrf };
}

export function verifySession(token) {
  return jwt.verify(token, SECRET); // throws on invalid/expired
}

export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export const hashResetToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");
