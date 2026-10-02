// Desk authentication, verified against the database on every request:
// - passwords: scrypt (memory-hard), random salt, constant-time compare
// - sessions: 256-bit random token in an HttpOnly, SameSite=Strict cookie; only its SHA-256 hash is stored
// - every desk request re-checks the session row and that the user's role is 'admin'
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { config } from "./config.js";
import { one, query } from "./db.js";
import { parseCookies } from "./http.js";

const scrypt = promisify(scryptCb);
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;
const SCRYPT_OPTS = { N, r: R, p: P, maxmem: 128 * N * R * 2 };

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT_OPTS);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (n !== N || r !== R || p !== P) return false; // only accept the parameters we issue
  const salt = Buffer.from(parts[4], "base64"), expected = Buffer.from(parts[5], "base64");
  if (expected.length !== KEYLEN) return false;
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT_OPTS);
  return timingSafeEqual(key, expected);
}

// Used when the email isn't an admin, so a wrong email takes as long as a wrong password.
let dummyHash = null;
export const getDummyHash = async () => (dummyHash ??= await hashPassword(randomBytes(18).toString("base64")));

/* ---------- sessions ---------- */
export const COOKIE = config.cookieSecure ? "__Host-sk_desk" : "sk_desk";
const sha256 = s => createHash("sha256").update(s).digest();

export function sessionCookie(token, maxAgeSeconds) {
  return [
    `${COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeSeconds}`,
    ...(config.cookieSecure ? ["Secure"] : [])
  ].join("; ");
}
export const clearCookie = () => sessionCookie("", 0);

export async function createSession(userId, userAgent) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `insert into admin_sessions (user_id, token_hash, expires_at, user_agent)
     values ($1, $2, now() + make_interval(hours => $3), $4)`,
    [userId, sha256(token), config.sessionHours, (userAgent || "").slice(0, 300)]
  );
  return token;
}

const readToken = req => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
};

// Returns { sessionId, user: { id, email, role } } or null.
export async function getSession(req) {
  const token = readToken(req);
  if (!token) return null;
  const row = await one(
    `select s.id as session_id, s.last_seen_at, u.id, u.email, u.role
       from admin_sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.role = 'admin'`,
    [sha256(token)]
  );
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    query("update admin_sessions set last_seen_at = now() where id = $1", [row.session_id]).catch(() => {});
  }
  return { sessionId: row.session_id, user: { id: row.id, email: row.email, role: row.role } };
}

export async function destroySession(req) {
  const token = readToken(req);
  if (token) await query("delete from admin_sessions where token_hash = $1", [sha256(token)]);
}

/* ---------- the admin account ---------- */
// ADMIN_EMAIL and ADMIN_PASSWORD (from .env locally, or Render's environment) are the source
// of truth: on every start the account exists with role 'admin', and if ADMIN_PASSWORD no longer
// matches the stored hash, the hash is replaced and all desk sessions are signed out.
// Only the scrypt hash is ever stored.
export async function ensureAdmin() {
  const { adminEmail: email, adminPassword: password } = config;
  if (!email) {
    const n = await one("select count(*)::int as n from admin_users where role = 'admin'");
    if (!n.n) console.warn("auth: no admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD.");
    return;
  }
  const existing = await one("select id, password_hash from admin_users where email = $1", [email]);
  if (!existing) {
    await query("insert into admin_users (email, role, password_hash) values ($1, 'admin', $2)",
      [email, password ? await hashPassword(password) : null]);
    console.log(`auth: admin account created${password ? " with the password from ADMIN_PASSWORD" : " (no password: set ADMIN_PASSWORD)"}.`);
    return;
  }
  if (!password) {
    if (!existing.password_hash) console.warn("auth: the admin has no password. Set ADMIN_PASSWORD.");
    return;
  }
  if (existing.password_hash && await verifyPassword(password, existing.password_hash)) return; // already in sync
  await query("update admin_users set password_hash = $2, role = 'admin', failed_attempts = 0, locked_until = null where id = $1",
    [existing.id, await hashPassword(password)]);
  await query("delete from admin_sessions where user_id = $1", [existing.id]);
  console.log("auth: admin password updated from ADMIN_PASSWORD.");
}
