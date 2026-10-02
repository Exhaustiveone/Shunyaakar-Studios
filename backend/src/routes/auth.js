// Desk sign-in. Checked against admin_users in the database; nothing about the
// admin account is known to the frontend.
import { query, one } from "../db.js";
import { HttpError, sendJson, readBody, cleanEmail } from "../http.js";
import { clientIp, rateLimiter, isSameOrigin } from "../security.js";
import { config } from "../config.js";
import {
  verifyPassword, getDummyHash, createSession, getSession, destroySession, sessionCookie, clearCookie
} from "../auth.js";

const loginLimit = rateLimiter({ windowMs: 15 * 60_000, max: 10 }); // per IP
const MAX_FAILS = 5, LOCK_MINUTES = 15;                                 // per account
const NO_MATCH = "That email and password don't match.";

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  if (!isSameOrigin(req)) throw new HttpError(403, "Sign in from the desk page.");
  const wait = loginLimit(clientIp(req));
  if (wait) throw new HttpError(429, "Too many attempts. Try again later.", { "Retry-After": String(wait) });

  const b = await readBody(req);
  const email = cleanEmail(b.email);
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password || password.length > 1024) {
    await verifyPassword("x", await getDummyHash()); // keep timing uniform
    throw new HttpError(401, NO_MATCH);
  }

  const user = await one(
    "select id, email, role, password_hash, locked_until from admin_users where email = $1",
    [email]
  );
  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(429, "Too many attempts. Try again later.", { "Retry-After": String(LOCK_MINUTES * 60) });
  }

  const ok = await verifyPassword(password, (user && user.password_hash) || await getDummyHash());
  if (!user || !user.password_hash || user.role !== "admin" || !ok) {
    if (user) {
      // Recorded in the background so a wrong password for a real account answers as fast
      // as an unknown email (otherwise the timing would reveal which emails exist).
      query(
        `update admin_users set
           failed_attempts = case when locked_until is not null and locked_until <= now() then 1 else failed_attempts + 1 end,
           locked_until = case when (case when locked_until is not null and locked_until <= now() then 1 else failed_attempts + 1 end) >= $2
                               then now() + make_interval(mins => $3) else null end
         where id = $1`,
        [user.id, MAX_FAILS, LOCK_MINUTES]
      ).catch(err => console.error("auth: couldn't record a failed attempt:", err.message));
    }
    throw new HttpError(401, NO_MATCH);
  }

  await query("update admin_users set failed_attempts = 0, locked_until = null, last_login_at = now() where id = $1", [user.id]);
  await query("delete from admin_sessions where expires_at <= now()"); // housekeeping
  const token = await createSession(user.id, req.headers["user-agent"]);
  sendJson(res, 200, { ok: true, user: { email: user.email } }, { "Set-Cookie": sessionCookie(token, config.sessionHours * 3600) });
}

// POST /api/auth/logout
export async function logout(req, res) {
  if (!isSameOrigin(req)) throw new HttpError(403, "Not allowed.");
  await destroySession(req);
  sendJson(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
}

// GET /api/auth/me — who is signed in (the desk calls this on load)
export async function me(req, res) {
  const s = await getSession(req);
  if (!s) return sendJson(res, 401, { ok: false, error: "Sign in to open the desk." }, { "Set-Cookie": clearCookie() });
  sendJson(res, 200, { ok: true, user: { email: s.user.email } });
}

// For desk routes: the signed-in admin, or a 401. State-changing calls must come from this site.
export async function requireAdmin(req) {
  if (req.method !== "GET" && !isSameOrigin(req)) throw new HttpError(403, "Not allowed.");
  const s = await getSession(req);
  if (!s) throw new HttpError(401, "Your session ended. Sign in again.");
  return s;
}
