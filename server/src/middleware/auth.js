import Staff from "../models/Staff.js";
import { verifySession } from "../utils/tokens.js";
import { can } from "../constants/roles.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/* Verifies the session cookie, loads the acting user onto req.user, and —
 * for any state-changing request — checks the CSRF header against the
 * claim baked into that same cookie (double-submit pattern). Every route
 * below /api except /api/auth/* goes through this. */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.ebkan_token;
    if (!token) return res.status(401).json({ error: "Not signed in" });

    const payload = verifySession(token);

    if (!SAFE_METHODS.has(req.method)) {
      const header = req.headers["x-csrf-token"];
      if (!header || header !== payload.csrf) {
        return res.status(403).json({ error: "Missing or invalid CSRF token" });
      }
    }

    const user = await Staff.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Account no longer active" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please sign in again" });
  }
}

export const requirePermission = (perm) => (req, res, next) => {
  if (!can(req.user, perm)) return res.status(403).json({ error: "You don't have permission to do that" });
  next();
};
