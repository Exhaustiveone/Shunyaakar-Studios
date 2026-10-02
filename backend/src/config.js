// All settings come from environment variables. Nothing secret lives in the code.
// Locally, a .env file (backend/.env, or the repo-root .env) is read if present;
// on Render, set the variables in the dashboard (see render.yaml).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_DIR = path.resolve(here, "..");
export const SITE_DIR = path.resolve(BACKEND_DIR, "..");

for (const file of [path.join(BACKEND_DIR, ".env"), path.join(SITE_DIR, ".env")]) {
  // loadEnvFile never overrides variables that are already set
  if (existsSync(file)) process.loadEnvFile(file);
}

const env = (name, fallback = "") => (process.env[name] ?? fallback).trim();
const int = (name, fallback) => {
  const n = Number.parseInt(env(name), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const bool = (name, fallback = false) => {
  const v = env(name).toLowerCase();
  return v ? ["1", "true", "yes", "on"].includes(v) : fallback;
};

const production = env("NODE_ENV") === "production";

export const config = Object.freeze({
  production,
  port: int("PORT", 3000),
  // Supabase Postgres connection string. Use the pooler URI (Supabase → Connect → Session or Transaction pooler).
  databaseUrl: env("DATABASE_URL") || env("SUPABASE_URI"),
  // Optional PEM text of Supabase's CA certificate (Supabase → Project Settings → Database → SSL).
  // With it, the database's TLS certificate is fully verified; without it the link is still encrypted.
  databaseCaCert: env("DATABASE_CA_CERT").replace(/\\n/g, "\n"),
  dbPoolMax: int("DB_POOL_MAX", 5),
  // The admin account. The password is read from ADMIN_PASSWORD on every start (see ensureAdmin).
  adminEmail: env("ADMIN_EMAIL").toLowerCase(),
  adminPassword: (process.env.ADMIN_PASSWORD || "").trim(),
  adminPasswordReset: bool("ADMIN_PASSWORD_RESET"),
  sessionHours: int("SESSION_HOURS", 72),
  // Extra origins allowed to POST to the public form endpoints (comma separated), e.g. an old static host.
  allowedOrigins: env("ALLOWED_ORIGINS").split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean),
  // Outgoing email for desk replies (SMTP). For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465,
  // SMTP_USER=your Gmail address, SMTP_PASS=a 16-character App Password (Google Account → Security).
  smtpHost: env("SMTP_HOST"),
  smtpPort: int("SMTP_PORT", 465),
  smtpUser: env("SMTP_USER"),
  smtpPass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""), // App Passwords are often pasted with spaces
  mailFrom: env("MAIL_FROM"),          // e.g. "Mayank Sharma | Shunyaakar <you@gmail.com>"; defaults to SMTP_USER
  mailReplyTo: env("MAIL_REPLY_TO"),   // where client answers go; defaults to the sender
  trustProxy: bool("TRUST_PROXY", production),
  // true when served over HTTPS (Render): Secure cookies, HSTS, upgrade-insecure-requests
  cookieSecure: bool("COOKIE_SECURE", production)
});

export function assertConfig() {
  const problems = [];
  if (!config.databaseUrl) problems.push("DATABASE_URL is not set (the Supabase Postgres connection string).");
  if (config.adminPassword && config.adminPassword.length < 12) problems.push("ADMIN_PASSWORD must be at least 12 characters.");
  if (config.adminPassword && !config.adminEmail) problems.push("ADMIN_PASSWORD is set but ADMIN_EMAIL is not.");
  if (problems.length) {
    for (const p of problems) console.error(`config: ${p}`);
    process.exit(1);
  }
}
