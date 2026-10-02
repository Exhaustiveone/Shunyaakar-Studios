// Security plumbing: response headers (incl. a strict Content-Security-Policy),
// client IP behind Render's proxy, in-memory rate limits, origin checks, CORS.
import { createHash } from "node:crypto";
import { config } from "./config.js";

/* ---------- Content-Security-Policy ---------- */
// Inline <script> blocks in the HTML (there's one tiny one in index.html) are allowed
// by their SHA-256 hash, computed from the files at startup, so no 'unsafe-inline' scripts.
export function inlineScriptHashes(htmlDocs) {
  const hashes = new Set();
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const html of htmlDocs) {
    for (const m of html.matchAll(re)) {
      if (/type\s*=\s*["']?application\/(ld\+)?json/i.test(m[1])) continue; // data blocks never run
      hashes.add(`'sha256-${createHash("sha256").update(m[2], "utf8").digest("base64")}'`);
    }
  }
  return [...hashes];
}

export function buildCsp(scriptHashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    // style attributes are set by the site's scripts (e.g. --i:3), so inline styles stay allowed
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(config.cookieSecure ? ["upgrade-insecure-requests"] : []) // i.e. served over HTTPS
  ].join("; ");
}

let CSP = buildCsp([]);
export const setCsp = value => { CSP = value; };

export function securityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  if (config.cookieSecure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

/* ---------- client IP ---------- */
export function clientIp(req) {
  if (config.trustProxy) {
    const cf = req.headers["cf-connecting-ip"] || req.headers["true-client-ip"];
    if (typeof cf === "string" && cf) return cf.trim();
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/* ---------- rate limiting (fixed window, per key, in memory) ---------- */
// Render runs one instance here, so memory is the right place. Returns 0 when allowed,
// otherwise the seconds until the window resets.
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000));
  sweep.unref();
  return key => {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      if (hits.size > 50_000) hits.clear(); // hard cap on memory under a flood
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count > max ? Math.ceil((entry.reset - now) / 1000) : 0;
  };
}

/* ---------- origins ---------- */
const originHost = origin => { try { return new URL(origin).host; } catch { return null; } };

export const isSameOrigin = req => {
  const origin = req.headers.origin;
  return !origin || originHost(origin) === req.headers.host;
};

// Public form endpoints: our own origin, plus any listed in ALLOWED_ORIGINS.
export function publicOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin || originHost(origin) === req.headers.host) return true;
  return config.allowedOrigins.includes(origin.replace(/\/+$/, ""));
}

export function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !config.allowedOrigins.includes(origin.replace(/\/+$/, ""))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  };
}
